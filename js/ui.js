// Screens (section 9.2). Only screens 1 (start) and 2 (site choice) exist so far.
import { t, loadLang, otherLang } from './i18n.js';
import { createState } from './engine.js';

const app = () => document.getElementById('app');

// Tiny helper: el('button', { class: 'btn', onclick }, 'text', childNode)
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

function render(...nodes) {
  app().replaceChildren(...nodes);
  window.scrollTo(0, 0);
}

function langButton(ctx, rerender) {
  return el('button', {
    class: 'btn lang-toggle',
    lang: otherLang(),
    onclick: async () => {
      await loadLang(otherLang());
      rerender(ctx);
    },
  }, t('lang.switch'));
}

// Screen 1: start
export function showStart(ctx) {
  render(
    el('section', { class: 'hero' },
      langButton(ctx, showStart),
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

// Screen 2: site choice
function siteCard(ctx, siteId) {
  return el('article', { class: 'card stack' },
    el('h2', {}, t(`site.${siteId}.name`)),
    el('p', {}, '✅ ', t(`site.${siteId}.pro`)),
    el('p', {}, '⚠️ ', t(`site.${siteId}.con`)),
    el('button', {
      class: 'btn btn-primary btn-block',
      onclick: () => {
        const state = createState(ctx.constants, siteId);
        console.log('New game state', state);
        showComingSoon(ctx, t(`site.${siteId}.name`));
      },
    }, t('site.choose')),
  );
}

export function showSitePicker(ctx) {
  render(
    el('h1', {}, t('site.title')),
    el('div', { class: 'grid-2 stack' }, siteCard(ctx, 'rim'), siteCard(ctx, 'shadow')),
    el('div', { class: 'action-bar' },
      el('button', { class: 'btn btn-block', onclick: () => showStart(ctx) }, t('common.back')),
    ),
  );
}

// Placeholder for screens not built yet.
function showComingSoon(ctx, title) {
  render(
    el('h1', {}, title),
    el('p', { class: 'badge' }, t('common.comingSoon')),
    el('div', { class: 'action-bar' },
      el('button', { class: 'btn btn-block', onclick: () => showStart(ctx) }, t('common.back')),
    ),
  );
}

export function showError(err) {
  render(
    el('div', { class: 'card stack', role: 'alert' },
      el('h1', {}, '⚠️'),
      el('p', {}, String(err.message ?? err)),
      el('p', { class: 'muted' }, 'Run a local server (npx serve .) instead of opening index.html directly.'),
    ),
  );
}
