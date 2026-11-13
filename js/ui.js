// The game itself, shown full-screen in #stage after the child presses Play:
// cutscene -> Moon site choice -> Moon base -> cutscene -> Mars base -> commander's report.
import { t, loadLang, otherLang, currentLang } from './i18n.js';
import {
  createState, step, stars, isNight, eventsOn, planUsage, previewDose,
  canBuyReactor, buyReactor, canEva, needsNightWarning, RESULT,
} from './engine.js';
import { pickPeriod, scheduleEvents, marsEvents } from './events.js';
import { baseScene } from './scene.js';
import { playCutscene } from './cutscene.js';

const app = () => document.getElementById('app');
const DANGER = ['FLR', 'SEP', 'CME_ARRIVAL'];
const INFO = ['CME', 'DUST_WARN', 'DUST', 'MOON_HELLO', 'MARS_HELLO'];
const FACT_SOURCE = {
  FLR: 'donki', SEP: 'ochmo', CME: 'donki', CME_ARRIVAL: 'shelter', DUST_WARN: 'fsp', DUST: 'fsp',
  FAULT: 'comm', NIGHT: 'fsp', MOON_HELLO: 'lunarDose', MARS_HELLO: 'rad',
};

// Tiny DOM helper: el('button', { class: 'btn', onclick }, 'text', childNode)
export function el(tag, attrs = {}, ...children) {
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

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const msv = (n) => t('unit.msv', { n: fmt(n) });

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(currentLang() === 'ar' ? 'ar' : 'en', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return String(iso).slice(0, 10);
  }
}

/* ---------- Stage frame ---------- */

function stageBar(ctx) {
  const level = ctx.game?.level;
  return el('div', { class: 'stage-bar' },
    el('button', { class: 'btn btn-small', onclick: () => ctx.closeStage() }, t('common.close')),
    el('span', { class: 'stage-title' }, level === 'mars' ? '🔴 ' : level === 'moon' ? '🌙 ' : '🚀 ', t('app.title')),
    el('button', {
      class: 'btn btn-small',
      lang: otherLang(),
      onclick: async () => {
        await loadLang(otherLang());
        ctx.onLang?.();
        ctx.current?.(ctx);
      },
    }, t('lang.switch')),
  );
}

function render(ctx, screenFn, ...nodes) {
  ctx.current = screenFn;
  app().replaceChildren(stageBar(ctx), ...nodes.filter((n) => n != null && n !== false));
}

function toTop() {
  document.getElementById('stage')?.scrollTo?.(0, 0);
}

/* ---------- Journey flow ---------- */

export function startJourney(ctx) {
  ctx.openStage();
  ctx.game = null;
  ctx.run = { moon: null, mars: null };
  cutscene(ctx, 'toMoon', () => showSitePicker(ctx));
}

function cutscene(ctx, kind, onDone) {
  ctx.current = null;
  const holder = el('div', { class: 'cut-holder' });
  app().replaceChildren(holder);
  ctx.cancelCutscene = playCutscene(holder, kind, () => {
    ctx.cancelCutscene = null;
    onDone();
  });
}

function siteCard(ctx, siteId) {
  return el('article', { class: 'card stack site-card' },
    el('h2', {}, t(`site.${siteId}.name`)),
    el('p', {}, '✅ ', t(`site.${siteId}.pro`)),
    el('p', {}, '⚠️ ', t(`site.${siteId}.con`)),
    el('button', { class: 'btn btn-primary btn-block', onclick: () => startLevel(ctx, 'moon', siteId) }, t('site.choose')),
  );
}

function showSitePicker(ctx) {
  ctx.game = null;
  toTop();
  render(ctx, showSitePicker,
    el('h1', { class: 'screen-title' }, t('site.title')),
    el('div', { class: 'grid-2 stack' }, siteCard(ctx, 'rim'), siteCard(ctx, 'shadow')),
  );
}

function startLevel(ctx, level, siteId) {
  const lc = { balance: level === 'mars' ? ctx.constants.mars : ctx.constants.balance };
  const period = level === 'moon' ? pickPeriod(ctx.donki) : null;
  const events = level === 'mars' ? marsEvents(lc) : scheduleEvents(period, lc);
  ctx.game = {
    level,
    lc,
    period,
    state: createState(lc, siteId, period, events),
    plan: {
      systems: { lifeSupport: true, greenhouse: true, science: true },
      shelter: false, eva: false, blocked: [], extraCost: 0, choice: null,
    },
  };
  toTop();
  beginDay(ctx);
}

// Turn off optional systems until the plan fits today's energy.
function fitPlan(ctx) {
  const { state, plan, lc } = ctx.game;
  if (plan.eva && (!canEva(state, lc) || plan.shelter)) plan.eva = false;
  for (const key of ['eva', 'science', 'greenhouse']) {
    if (planUsage(state, plan, lc).fits) break;
    if (key === 'eva') plan.eva = false;
    else plan.systems[key] = false;
  }
}

function beginDay(ctx) {
  const { state, plan, lc, level } = ctx.game;
  Object.assign(plan, { shelter: false, eva: false, blocked: [], extraCost: 0, choice: null });
  fitPlan(ctx);
  const queue = [];
  if (state.day === 1) queue.push({ kind: level === 'mars' ? 'MARS_HELLO' : 'MOON_HELLO' });
  if (needsNightWarning(state, lc)) queue.push({ kind: 'NIGHT' });
  const yesterdayDust = eventsOn(state, state.day - 1).some((e) => e.kind === 'DUST');
  queue.push(...eventsOn(state).filter((e) => !(e.kind === 'DUST' && yesterdayDust)));
  ctx.game.queue = queue;
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
  g.state = step(g.state, g.plan, g.lc);
  if (!g.state.over) return beginDay(ctx);
  ctx.run[g.level] = { state: g.state, lc: g.lc };
  toTop();
  if (g.level === 'moon') showMoonEnd(ctx);
  else showFinal(ctx);
}

/* ---------- Dashboard ---------- */

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
  const { state, plan, lc } = ctx.game;
  const c = lc.balance;
  const isEva = key === 'eva';
  const on = isEva ? plan.eva : plan.systems[key];
  const cost = isEva ? c.eva.energy : c.systems[key];
  const broken = plan.blocked.includes(key);
  const paused = plan.shelter && key !== 'lifeSupport';
  const tired = isEva && !canEva(state, lc);
  const active = on && !paused && !broken;
  const tooExpensive = !active && usage.used + cost > usage.energy.total;
  const disabled = broken || paused || tired || tooExpensive;
  const descN = key === 'science' ? c.science.experiment : isEva ? c.science.eva : '';

  let reason = null;
  if (broken) reason = t('sys.broken');
  else if (paused) reason = t('sys.pausedShelter');
  else if (tired) reason = t('sys.evaRest');
  else if (tooExpensive) reason = t('energy.notEnough');

  return el('button', {
    class: `toggle ${active ? 'is-on' : ''}`,
    'aria-pressed': String(active),
    disabled,
    onclick: () => {
      if (isEva) plan.eva = !plan.eva;
      else plan.systems[key] = !plan.systems[key];
      showDashboard(ctx);
    },
  },
    el('span', { class: 'toggle-name' }, t(`sys.${key}.name`)),
    el('span', { class: 'toggle-desc muted' }, t(`sys.${key}.desc`, { n: descN })),
    el('span', { class: 'toggle-cost' }, t('sys.cost', { n: cost }), ' · ', active ? t('sys.on') : t('sys.off')),
    reason ? el('span', { class: 'toggle-reason' }, reason) : null,
  );
}

function reactorBox(ctx) {
  const { state, lc } = ctx.game;
  const r = lc.balance.reactor;
  if (state.reactor) return el('p', { class: 'card ok' }, t('reactor.owned', { n: r.energyPerDay }));
  const can = canBuyReactor(state, lc);
  return el('button', {
    class: 'btn btn-block',
    disabled: !can,
    onclick: () => {
      ctx.game.state = buyReactor(state, lc);
      showDashboard(ctx);
    },
  }, can ? t('reactor.buy', { cost: r.cost }) : t('reactor.need', { cost: r.cost }));
}

function showDashboard(ctx) {
  const { state, plan, period, lc, level } = ctx.game;
  const b = lc.balance;
  const usage = planUsage(state, plan, lc);
  const last = state.log.at(-1)?.deltas;
  const night = isNight(state.day, lc);
  const mars = level === 'mars';
  const kinds = eventsOn(state).map((e) => e.kind);

  render(ctx, showDashboard,
    el('div', { class: 'scene-wrap' },
      baseScene({ level, night, plan, reactor: state.reactor, eventKinds: kinds, label: t('hud.scene') }),
      el('div', { class: 'scene-hud' },
        el('strong', {}, t(mars ? 'hud.sol' : 'hud.day', { day: state.day, total: b.days })),
        el('span', { class: `badge ${night ? 'badge-night' : 'badge-day'}` }, mars ? t('hud.marsDay') : night ? t('hud.night') : t('hud.dayTime')),
      ),
    ),
    el('p', { class: 'badge badge-archive' }, '📁 ',
      mars ? t('hud.simplified') : t('hud.archive', { period: period?.label?.[currentLang()] ?? '' })),

    el('section', { class: 'meters grid-2' },
      meter({ icon: '🫁', label: t('hud.life'), value: state.life, max: b.life.max, tone: 'life', delta: last?.life }),
      meter({
        icon: '☢️', label: t('hud.dose'), value: state.dose, max: b.radiation.missionBudget, tone: 'dose',
        delta: last?.dose, hint: t('hud.doseHint', { max: b.radiation.missionBudget }),
      }),
      meter({ icon: '🔋', label: t('hud.battery'), value: state.battery, max: b.batteryCapacity, tone: 'energy', delta: last?.battery }),
      meter({
        icon: '🔬', label: t('hud.science'), value: state.science, max: b.science.stars.at(-1), tone: 'science',
        delta: last?.science, hint: b.science.stars.map((s, i) => `${'⭐'.repeat(i + 1)} ${s}`).join(' · '),
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
          usage.upkeep.total ? t('energy.upkeep', { n: usage.upkeep.total }) : null,
          plan.extraCost ? t('energy.repair', { n: plan.extraCost }) : null,
        ].filter(Boolean).join(' · '),
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

/* ---------- Event sheet ---------- */

function sheet(ctx, screenFn, ...content) {
  render(ctx, screenFn,
    el('div', { class: 'sheet-backdrop' },
      el('section', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, ...content.filter(Boolean)),
    ),
  );
  app().querySelector('.sheet button')?.focus?.();
}

function factBox(ctx, kind) {
  const source = ctx.constants.sources[FACT_SOURCE[kind]];
  return el('aside', { class: 'fact' },
    el('strong', {}, t('fact.title')),
    el('p', {}, t(`fact.${kind}`)),
    source ? el('a', { href: source.url, target: '_blank', rel: 'noopener' }, t('fact.source'), ': ', source.name) : null,
  );
}

function eventBadge(event) {
  if (event.time) {
    return el('p', { class: 'badge badge-archive' }, '✅ ', t('event.real'), ' · ', t('event.date', { date: formatDate(event.time) }));
  }
  if (event.scripted) return el('p', { class: 'badge' }, '🎮 ', t('event.scripted'));
  return null;
}

function showEvent(ctx, event) {
  const { state, plan, lc } = ctx.game;
  const kind = event.kind;
  const again = () => showEvent(ctx, event);
  const head = [
    el('h2', {}, t(`event.${kind}.title`, { class: event.class ?? '' })),
    el('p', {}, t(`event.${kind}.text`, { speed: event.speedKmS ?? '' })),
    eventBadge(event),
  ];

  if (INFO.includes(kind)) {
    return sheet(ctx, again, ...head, factBox(ctx, kind),
      el('button', { class: 'btn btn-primary btn-block', onclick: () => nextPopup(ctx) }, t('event.ok')));
  }

  if (kind === 'FAULT') {
    const cost = lc.balance.script.faultFixCost;
    const choose = (fix) => {
      plan.choice = fix ? 'fix' : 'wait';
      if (fix) plan.extraCost = cost;
      else plan.blocked = ['greenhouse'];
      fitPlan(ctx);
      nextPopup(ctx);
    };
    return sheet(ctx, again, ...head,
      el('div', { class: 'choices' },
        el('button', { class: 'btn btn-choice', onclick: () => choose(false) },
          el('span', {}, t('event.FAULT.wait')), el('small', {}, t('event.FAULT.waitCost'))),
        el('button', { class: 'btn btn-choice', onclick: () => choose(true) },
          el('span', {}, t('event.FAULT.fix')), el('small', {}, t('event.FAULT.fixCost', { n: cost }))),
      ),
      factBox(ctx, kind));
  }

  const choose = (shelter) => {
    plan.shelter = shelter;
    fitPlan(ctx);
    nextPopup(ctx);
  };
  sheet(ctx, again, ...head,
    el('div', { class: 'choices' },
      el('button', { class: 'btn btn-choice', onclick: () => choose(true) },
        el('span', {}, t('event.shelter')),
        el('small', {}, t('event.shelterCost', { dose: msv(previewDose(state, lc, { shelter: true })) }))),
      el('button', { class: 'btn btn-choice', onclick: () => choose(false) },
        el('span', {}, t('event.continue')),
        el('small', {}, t('event.continueCost', { dose: msv(previewDose(state, lc)) }))),
    ),
    factBox(ctx, kind));
}

function showNightWarning(ctx) {
  const { state, lc } = ctx.game;
  const cost = lc.balance.reactor.cost;
  const can = canBuyReactor(state, lc);
  sheet(ctx, showNightWarning,
    el('h2', {}, t('night.title')),
    el('p', {}, t('night.text')),
    can
      ? el('button', {
        class: 'btn btn-primary btn-block',
        onclick: () => { ctx.game.state = buyReactor(state, lc); nextPopup(ctx); },
      }, t('night.buy', { cost }))
      : el('p', { class: 'muted' }, t('night.cant')),
    factBox(ctx, 'NIGHT'),
    el('button', { class: 'btn btn-block', onclick: () => nextPopup(ctx) }, t('night.ok')),
  );
}

/* ---------- Results ---------- */

const stormDays = (log) => log.filter((d) => d.events.some((e) => DANGER.some((k) => e.startsWith(k))));
const starRow = (n) => '⭐'.repeat(n) + '☆'.repeat(3 - n);

function resultCard(title, run) {
  const { state, lc } = run;
  const n = stars(state, lc);
  return el('section', { class: 'card stack result-card' },
    el('h2', {}, title),
    el('p', { class: 'result-line' }, t(`end.${state.result}`)),
    state.result !== RESULT.SUCCESS ? el('p', { class: 'muted' }, t(`end.${state.result}Why`)) : null,
    el('p', { class: 'stars', 'aria-label': `${n}/3` }, starRow(n)),
    el('p', {}, t('end.science', { n: state.science }), ' · ', t('end.days', { n: state.log.length })),
  );
}

function showMoonEnd(ctx) {
  const run = ctx.run.moon;
  const storms = stormDays(run.state.log);
  render(ctx, showMoonEnd,
    resultCard(t('final.moon'), run),
    el('section', { class: 'card stack' },
      el('h2', {}, t('end.storms')),
      storms.length
        ? el('ul', { class: 'storm-list' }, storms.map((d) =>
          el('li', {}, t(d.shelter ? 'end.stormShelter' : 'end.stormStay', { day: d.day }))))
        : el('p', { class: 'muted' }, t('end.noStorms')),
    ),
    el('div', { class: 'stack end-actions' },
      el('button', {
        class: 'btn btn-primary btn-block btn-big',
        onclick: () => cutscene(ctx, 'toMars', () => startLevel(ctx, 'mars', 'mars')),
      }, t('end.toMars')),
      el('button', { class: 'btn btn-block', onclick: () => showSitePicker(ctx) }, t('end.again')),
    ),
  );
}

// Simple advice built from what the child actually did in both missions.
function buildTips(ctx) {
  const { moon, mars } = ctx.run;
  const tips = [];
  const logs = [...moon.state.log, ...mars.state.log];
  const storms = stormDays(logs);
  const stayed = storms.filter((d) => !d.shelter);

  if (stayed.length) tips.push('shelterBad');
  else if (storms.length) tips.push('shelterGood');
  if (stayed.some((d) => d.eva)) tips.push('evaStorm');

  const moonSite = moon.lc.balance.sites[moon.state.site];
  const moonDark = moon.state.log.some((d) => d.night && !d.ran.lifeSupport);
  if (moonDark && moonSite.sunNight === 0) tips.push('nightPlan');
  const lifeTrouble = moon.state.result === RESULT.LIFE || mars.state.result === RESULT.LIFE
    || logs.some((d) => !d.ran.lifeSupport) || moon.state.life < 50;
  tips.push(lifeTrouble ? 'lifeLow' : 'lifeGood');

  const dustMissed = mars.state.log.some((d) => d.events.includes('DUST') && !d.ran.lifeSupport);
  const sawDust = mars.state.log.some((d) => d.events.includes('DUST'));
  if (dustMissed) tips.push('dustPlan');
  else if (sawDust) tips.push('dustGood');

  const fault = mars.state.log.find((d) => d.choice);
  if (fault) tips.push(fault.choice === 'fix' ? 'faultFix' : 'faultWait');

  const total = stars(moon.state, moon.lc) + stars(mars.state, mars.lc);
  tips.push(total >= 4 && !stayed.length ? 'scienceGood' : total < 4 ? 'scienceLow' : null);
  return tips.filter(Boolean);
}

function showFinal(ctx) {
  const { moon, mars } = ctx.run;
  const total = stars(moon.state, moon.lc) + stars(mars.state, mars.lc);
  const rank = total >= 6 ? 3 : total >= 4 ? 2 : total >= 2 ? 1 : 0;
  render(ctx, showFinal,
    el('section', { class: 'card stack final-head' },
      el('h1', {}, t('final.title')),
      el('p', {}, t('final.intro')),
      el('p', { class: 'rank' }, '🎖️ ', t(`final.rank${rank}`)),
      el('p', { class: 'muted' }, t('final.total', { n: total })),
    ),
    el('div', { class: 'grid-2 stack' }, resultCard(t('final.moon'), moon), resultCard(t('final.mars'), mars)),
    el('section', { class: 'card stack' },
      el('h2', {}, t('final.tipsTitle')),
      el('ul', { class: 'tips' }, buildTips(ctx).map((id) => el('li', {}, t(`final.tips.${id}`)))),
    ),
    el('div', { class: 'stack end-actions' },
      el('button', { class: 'btn btn-primary btn-block btn-big', onclick: () => ctx.closeStage('nasa') }, t('final.next')),
      el('button', { class: 'btn btn-block', onclick: () => startJourney(ctx) }, t('final.again')),
    ),
  );
}

export function showError(err) {
  document.getElementById('page').replaceChildren(
    el('div', { class: 'card stack', role: 'alert' },
      el('h1', {}, '⚠️'),
      el('p', {}, String(err.message ?? err)),
      el('p', { class: 'muted' }, 'Run a local server (npx serve .) instead of opening index.html directly.'),
    ),
  );
}
