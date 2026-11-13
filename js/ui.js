// Screens (PRD section 9.2): start, site choice, dashboard, event sheet, end.
import { t, loadLang, otherLang, currentLang } from './i18n.js';
import {
  createState, step, stars, isNight, eventsOn, planUsage, previewDose,
  canBuyReactor, buyReactor, canEva, needsNightWarning, RESULT,
} from './engine.js';
import { pickPeriod, scheduleEvents } from './events.js';

const app = () => document.getElementById('app');

// Tiny DOM helper: el('button', { class: 'btn', onclick }, 'text', childNode)
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value);
    } else if (value !== false && value != null) {
      node.setAttribute(key, value === true ? '' : value);
    }
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function render(ctx, screenFn, ...nodes) {
  ctx.current = screenFn;
  app().replaceChildren(...nodes.filter((n) => n != null && n !== false));
}

function langButton(ctx) {
  return el('button', {
    class: 'btn btn-small lang-toggle',
    lang: otherLang(),
    onclick: async () => {
      await loadLang(otherLang());
      ctx.current(ctx);
    },
  }, t('lang.switch'));
}

const fmt = (n) => Number.isInteger(n) ? String(n) : n.toFixed(1);

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(currentLang() === 'ar' ? 'ar' : 'en', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

/* ---------- Screen 1: start ---------- */

export function showStart(ctx) {
  window.scrollTo(0, 0);
  render(ctx, showStart,
    el('section', { class: 'hero' },
      langButton(ctx),
      el('h1', {}, t('app.title')),
      el('p', { class: 'muted' }, t('app.tagline')),
    ),
    el('div', { class: 'stack', style: 'margin-block-start:16px' },
      el('button', { class: 'btn btn-primary btn-block', onclick: () => showSitePicker(ctx) }, t('start.play')),
      el('button', { class: 'btn btn-block', disabled: true }, t('start.marsLocked')),
      el('button', { class: 'btn btn-block', onclick: () => showComingSoon(ctx, t('start.sources')) }, t('start.sources')),
    ),
  );
}

/* ---------- Screen 2: site choice ---------- */

function siteCard(ctx, siteId) {
  return el('article', { class: 'card stack' },
    el('h2', {}, t(`site.${siteId}.name`)),
    el('p', {}, '✅ ', t(`site.${siteId}.pro`)),
    el('p', {}, '⚠️ ', t(`site.${siteId}.con`)),
    el('button', { class: 'btn btn-primary btn-block', onclick: () => startGame(ctx, siteId) }, t('site.choose')),
  );
}

export function showSitePicker(ctx) {
  window.scrollTo(0, 0);
  render(ctx, showSitePicker,
    langButton(ctx),
    el('h1', { class: 'with-toggle' }, t('site.title')),
    el('div', { class: 'grid-2 stack' }, siteCard(ctx, 'rim'), siteCard(ctx, 'shadow')),
    el('div', { class: 'action-bar' },
      el('button', { class: 'btn btn-block', onclick: () => showStart(ctx) }, t('common.back')),
    ),
  );
}

/* ---------- Game flow ---------- */

function startGame(ctx, siteId) {
  const period = pickPeriod(ctx.donki);
  const events = scheduleEvents(period, ctx.constants);
  ctx.game = {
    period,
    state: createState(ctx.constants, siteId, period, events),
    plan: { systems: { lifeSupport: true, greenhouse: true, science: true }, shelter: false, eva: false },
  };
  beginDay(ctx);
}

// Turn off optional systems until the plan fits today's energy.
function fitPlan(ctx) {
  const { state, plan } = ctx.game;
  for (const key of ['science', 'greenhouse']) {
    if (planUsage(state, plan, ctx.constants).fits) break;
    plan.systems[key] = false;
  }
  if (plan.eva && (!canEva(state, ctx.constants) || !planUsage(state, plan, ctx.constants).fits)) plan.eva = false;
}

function beginDay(ctx) {
  const { state } = ctx.game;
  ctx.game.plan.shelter = false;
  ctx.game.plan.eva = false;
  fitPlan(ctx);
  ctx.game.queue = [];
  if (needsNightWarning(state, ctx.constants)) ctx.game.queue.push({ kind: 'NIGHT' });
  ctx.game.queue.push(...eventsOn(state));
  nextPopup(ctx);
}

function nextPopup(ctx) {
  const item = ctx.game.queue.shift();
  if (!item) return showDashboard(ctx);
  if (item.kind === 'NIGHT') return showNightWarning(ctx);
  return showEvent(ctx, item);
}

function endDay(ctx) {
  const g = ctx.game;
  g.state = step(g.state, g.plan, ctx.constants);
  if (g.state.over) return showEnd(ctx);
  beginDay(ctx);
}

/* ---------- Screen 3: dashboard ---------- */

function meter({ icon, label, value, max, display, tone, delta, hint }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return el('div', { class: `meter meter-${tone}` },
    el('div', { class: 'meter-head' },
      el('span', { class: 'meter-label' }, icon, ' ', label),
      el('span', { class: 'meter-value' }, display ?? fmt(value),
        delta ? el('span', { class: `delta ${delta > 0 ? 'up' : 'down'}` }, delta > 0 ? ` ↑${fmt(delta)}` : ` ↓${fmt(-delta)}`) : null),
    ),
    el('div', {
      class: 'bar', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': value, 'aria-label': label,
    }, el('div', { class: 'bar-fill', style: `inline-size:${pct}%` })),
    hint ? el('div', { class: 'meter-hint muted' }, hint) : null,
  );
}

function systemToggle(ctx, key, usage) {
  const { state, plan } = ctx.game;
  const c = ctx.constants.balance;
  const isEva = key === 'eva';
  const on = isEva ? plan.eva : plan.systems[key];
  const cost = isEva ? c.eva.energy : c.systems[key];
  const paused = plan.shelter && key !== 'lifeSupport';
  const tired = isEva && !canEva(state, ctx.constants);
  const tooExpensive = !on && usage.used + cost > usage.energy.total;
  const disabled = paused || tired || tooExpensive;
  const descN = key === 'science' ? c.science.experiment : isEva ? c.science.eva : '';

  let reason = null;
  if (paused) reason = t('sys.pausedShelter');
  else if (tired) reason = t('sys.evaRest');
  else if (tooExpensive) reason = t('energy.notEnough');

  return el('button', {
    class: `toggle ${on && !paused ? 'is-on' : ''}`,
    'aria-pressed': String(on && !paused),
    disabled,
    onclick: () => {
      if (isEva) plan.eva = !plan.eva;
      else plan.systems[key] = !plan.systems[key];
      showDashboard(ctx);
    },
  },
    el('span', { class: 'toggle-name' }, t(`sys.${key}.name`)),
    el('span', { class: 'toggle-desc muted' }, t(`sys.${key}.desc`, { n: descN })),
    el('span', { class: 'toggle-cost' }, t('sys.cost', { n: cost }), ' · ', on && !paused ? t('sys.on') : t('sys.off')),
    reason ? el('span', { class: 'toggle-reason' }, reason) : null,
  );
}

function reactorBox(ctx) {
  const { state } = ctx.game;
  const r = ctx.constants.balance.reactor;
  if (state.reactor) return el('p', { class: 'card ok' }, t('reactor.owned', { n: r.energyPerDay }));
  const can = canBuyReactor(state, ctx.constants);
  return el('button', {
    class: 'btn btn-block',
    disabled: !can,
    onclick: () => {
      ctx.game.state = buyReactor(state, ctx.constants);
      showDashboard(ctx);
    },
  }, can ? t('reactor.buy', { cost: r.cost }) : t('reactor.need', { cost: r.cost }));
}

function showDashboard(ctx) {
  const { state, plan, period } = ctx.game;
  const b = ctx.constants.balance;
  const usage = planUsage(state, plan, ctx.constants);
  const last = state.log.at(-1)?.deltas;
  const night = isNight(state.day, ctx.constants);
  const label = period?.label?.[currentLang()] ?? '';

  render(ctx, showDashboard,
    langButton(ctx),
    el('header', { class: 'day-head with-toggle' },
      el('h1', {}, t('hud.day', { day: state.day, total: b.days })),
      el('span', { class: `badge ${night ? 'badge-night' : 'badge-day'}` }, night ? t('hud.night') : t('hud.dayTime')),
    ),
    period ? el('p', { class: 'badge badge-archive' }, '📁 ', t('hud.archive', { period: label })) : null,

    el('section', { class: 'meters grid-2' },
      meter({ icon: '🫁', label: t('hud.life'), value: state.life, max: b.life.max, tone: 'life', delta: last?.life }),
      meter({
        icon: '☢️', label: t('hud.dose'), value: state.dose, max: b.radiation.missionBudget, tone: 'dose',
        display: `${fmt(state.dose)} mSv`, delta: last?.dose, hint: t('hud.doseHint', { max: b.radiation.missionBudget }),
      }),
      meter({ icon: '🔋', label: t('hud.battery'), value: state.battery, max: b.batteryCapacity, tone: 'energy', delta: last?.battery }),
      meter({
        icon: '🔬', label: t('hud.science'), value: state.science, max: b.science.stars.at(-1), tone: 'science',
        delta: last?.science, hint: t('hud.starsHint', { stars: b.science.stars.map((s, i) => `${'⭐'.repeat(i + 1)} ${s}`).join(' · ') }),
      }),
    ),

    el('section', { class: 'card energy-card' },
      el('h2', {}, t('energy.title')),
      el('div', { class: 'energy-row' },
        el('div', {}, el('div', { class: 'big' }, usage.energy.total), el('div', { class: 'muted' }, t('energy.have'))),
        el('div', {}, el('div', { class: 'big' }, usage.used), el('div', { class: 'muted' }, t('energy.use'))),
        el('div', {}, el('div', { class: 'big' }, usage.toBattery), el('div', { class: 'muted' }, t('energy.left'))),
      ),
      el('p', { class: 'muted small' },
        [t('energy.sun', { n: usage.energy.sun }),
          usage.energy.reactor ? t('energy.reactor', { n: usage.energy.reactor }) : null,
          usage.energy.battery ? t('energy.stored', { n: usage.energy.battery }) : null,
        ].filter(Boolean).join(' + '),
        usage.upkeep.total ? ` · ${t('energy.upkeep', { n: usage.upkeep.total })}` : '',
      ),
    ),

    plan.shelter ? el('p', { class: 'card warn' }, t('shelter.active')) : null,

    el('section', { class: 'stack' },
      el('h2', {}, t('sys.title')),
      el('div', { class: 'toggles' },
        systemToggle(ctx, 'lifeSupport', usage),
        systemToggle(ctx, 'greenhouse', usage),
        systemToggle(ctx, 'science', usage),
        systemToggle(ctx, 'eva', usage),
      ),
      reactorBox(ctx),
    ),

    el('div', { class: 'action-bar' },
      el('button', { class: 'btn btn-primary btn-block btn-big', onclick: () => endDay(ctx) }, t('endDay')),
    ),
  );
}

/* ---------- Screen 4: event sheet ---------- */

function sheet(ctx, screenFn, ...content) {
  render(ctx, screenFn,
    el('div', { class: 'sheet-backdrop' },
      el('section', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, ...content),
    ),
  );
  app().querySelector('.sheet button')?.focus();
}

function showEvent(ctx, event) {
  const { state, plan } = ctx.game;
  const kind = event.kind;
  const again = () => showEvent(ctx, event);
  const title = t(`event.${kind}.title`, { class: event.class ?? '' });
  const text = t(`event.${kind}.text`, { speed: event.speedKmS ?? '' });
  const meta = el('p', { class: 'badge badge-archive' }, '✅ ', t('event.real'), ' · ', t('event.date', { date: formatDate(event.time) }));

  if (kind === 'CME') {
    return sheet(ctx, again,
      el('h2', {}, title), el('p', {}, text), meta,
      el('button', { class: 'btn btn-primary btn-block', onclick: () => nextPopup(ctx) }, t('event.ok')),
    );
  }

  const choose = (shelter) => {
    plan.shelter = shelter;
    if (shelter) plan.eva = false;
    fitPlan(ctx);
    nextPopup(ctx);
  };
  sheet(ctx, again,
    el('h2', {}, title), el('p', {}, text), meta,
    el('div', { class: 'choices' },
      el('button', { class: 'btn btn-choice', onclick: () => choose(true) },
        el('span', {}, t('event.shelter')),
        el('small', {}, t('event.shelterCost', { dose: `${previewDose(state, ctx.constants, { shelter: true })} mSv` })),
      ),
      el('button', { class: 'btn btn-choice', onclick: () => choose(false) },
        el('span', {}, t('event.continue')),
        el('small', {}, t('event.continueCost', { dose: `${previewDose(state, ctx.constants)} mSv` })),
      ),
    ),
  );
}

function showNightWarning(ctx) {
  const { state } = ctx.game;
  const cost = ctx.constants.balance.reactor.cost;
  const can = canBuyReactor(state, ctx.constants);
  sheet(ctx, showNightWarning,
    el('h2', {}, t('night.title')),
    el('p', {}, t('night.text')),
    can
      ? el('button', {
        class: 'btn btn-primary btn-block',
        onclick: () => { ctx.game.state = buyReactor(state, ctx.constants); nextPopup(ctx); },
      }, t('night.buy', { cost }))
      : el('p', { class: 'muted' }, t('night.cant')),
    el('button', { class: 'btn btn-block', onclick: () => nextPopup(ctx) }, t('night.ok')),
  );
}

/* ---------- Screen 6: end ---------- */

function showEnd(ctx) {
  const { state } = ctx.game;
  const n = stars(state, ctx.constants);
  const storms = state.log.filter((d) => d.events.some((e) => e !== 'CME'));
  window.scrollTo(0, 0);

  render(ctx, showEnd,
    langButton(ctx),
    el('section', { class: 'card stack with-toggle' },
      el('h1', {}, t(`end.${state.result}`)),
      state.result !== RESULT.SUCCESS ? el('p', {}, t(`end.${state.result}Why`)) : null,
      el('p', { class: 'stars', 'aria-label': `${n}/3` }, '⭐'.repeat(n) + '☆'.repeat(3 - n)),
      el('p', {}, t('end.science', { n: state.science })),
    ),
    el('section', { class: 'card stack' },
      el('h2', {}, t('end.storms')),
      storms.length
        ? el('ul', { class: 'storm-list' }, storms.map((d) =>
          el('li', {}, t(d.shelter ? 'end.stormShelter' : 'end.stormStay', { day: d.day }))))
        : el('p', { class: 'muted' }, t('end.noStorms')),
    ),
    el('div', { class: 'stack', style: 'margin-block-start:16px' },
      el('button', { class: 'btn btn-primary btn-block', onclick: () => showSitePicker(ctx) }, t('end.again')),
      el('button', { class: 'btn btn-block', onclick: () => showStart(ctx) }, t('end.home')),
    ),
  );
}

/* ---------- Placeholders ---------- */

function showComingSoon(ctx, title) {
  const again = () => showComingSoon(ctx, title);
  render(ctx, again,
    el('h1', {}, title),
    el('p', { class: 'badge' }, t('common.comingSoon')),
    el('div', { class: 'action-bar' },
      el('button', { class: 'btn btn-block', onclick: () => showStart(ctx) }, t('common.back')),
    ),
  );
}

export function showError(err) {
  app().replaceChildren(
    el('div', { class: 'card stack', role: 'alert' },
      el('h1', {}, '⚠️'),
      el('p', {}, String(err.message ?? err)),
      el('p', { class: 'muted' }, 'Run a local server (npx serve .) instead of opening index.html directly.'),
    ),
  );
}
