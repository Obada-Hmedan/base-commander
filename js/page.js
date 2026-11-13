// The scrolling page around the game: intro, about NASA, how to become an astronaut, sources.
import { t, raw, loadLang, otherLang } from './i18n.js';
import { el } from './ui.js';
import { svg, logoMarkup } from './art.js';

const IMG = 'assets/img/';

function photo(file, alt, credit) {
  return el('figure', { class: 'photo' },
    el('img', { src: IMG + file, alt, loading: 'lazy', decoding: 'async' }),
    el('figcaption', {}, '📷 ', credit),
  );
}

function hero(ctx) {
  return el('section', { class: 'hero', id: 'top' },
    el('div', { class: 'hero-bg', role: 'img', 'aria-label': 'Earth setting behind the Moon, photographed by the Artemis II crew' }),
    el('button', {
      class: 'btn btn-small lang-toggle',
      lang: otherLang(),
      onclick: async () => { await loadLang(otherLang()); renderPage(ctx); },
    }, t('lang.switch')),
    el('div', { class: 'hero-inner' },
      svg(logoMarkup(), 'viewBox="0 0 120 120" class="logo" role="img" aria-label="Base Commander logo"'),
      el('p', { class: 'kicker' }, t('hero.kicker')),
      el('h1', { class: 'hero-title' }, t('app.title')),
      el('p', { class: 'hero-tag' }, t('app.tagline')),
      el('p', { class: 'hero-intro' }, t('hero.intro')),
      el('button', { class: 'play', 'aria-label': t('hero.play'), onclick: () => ctx.play() },
        el('span', { class: 'play-icon', 'aria-hidden': 'true' }, '▶'),
        el('span', { class: 'play-text' }, t('hero.play')),
      ),
      el('p', { class: 'muted small' }, t('hero.playHint')),
      el('h2', { class: 'what-title' }, t('hero.whatTitle')),
      el('ul', { class: 'what' }, raw('hero.what').map((w) =>
        el('li', {}, el('span', { class: 'what-icon', 'aria-hidden': 'true' }, w.icon), w.text))),
      el('p', { class: 'badge badge-real' }, '🛰️ ', t('hero.real')),
      el('p', { class: 'photo-credit' }, '📷 NASA · Artemis II'),
      el('a', { class: 'scroll-hint', href: '#nasa' }, t('hero.scroll')),
    ),
  );
}

function nasa() {
  return el('section', { class: 'section', id: 'nasa' },
    el('p', { class: 'kicker' }, t('nasa.kicker')),
    el('h2', { class: 'section-title' }, t('nasa.title')),
    el('p', { class: 'lead' }, t('nasa.intro')),
    el('h3', {}, t('nasa.achTitle')),
    el('ol', { class: 'timeline' }, raw('nasa.ach').map((a) =>
      el('li', { class: 'card ach' },
        photo(a.img, a.title, a.credit),
        el('div', { class: 'ach-body' },
          el('span', { class: 'year' }, a.year),
          el('h4', {}, a.title),
          el('p', {}, a.text),
        ),
      ))),
    el('h3', {}, t('nasa.supportTitle')),
    el('div', { class: 'support-wrap' },
      photo('training.jpg', t('nasa.trainingCaption'), 'NASA'),
      el('ul', { class: 'tiles' }, raw('nasa.support').map((s) =>
        el('li', { class: 'card tile' },
          el('span', { class: 'tile-icon', 'aria-hidden': 'true' }, s.icon),
          el('h4', {}, s.title),
          el('p', {}, s.text),
        ))),
    ),
  );
}

function astro(ctx) {
  return el('section', { class: 'section section-alt', id: 'astronaut' },
    el('p', { class: 'kicker' }, t('astro.kicker')),
    el('h2', { class: 'section-title' }, t('astro.title')),
    el('p', { class: 'lead' }, t('astro.intro')),
    el('h3', {}, t('astro.nowTitle')),
    el('ol', { class: 'tiles steps' }, raw('astro.now').map((s, i) =>
      el('li', { class: 'card tile' },
        el('span', { class: 'step-num', 'aria-hidden': 'true' }, i + 1),
        el('span', { class: 'tile-icon', 'aria-hidden': 'true' }, s.icon),
        el('h4', {}, s.title),
        el('p', {}, s.text),
      ))),
    el('h3', {}, t('astro.laterTitle')),
    el('ul', { class: 'card later' }, raw('astro.later').map((line) => el('li', {}, line))),
    el('div', { class: 'card world' },
      el('h3', {}, '🌍 ', t('astro.worldTitle')),
      el('p', {}, t('astro.world')),
    ),
    el('h3', {}, t('astro.helpTitle')),
    el('ul', { class: 'links' }, raw('astro.help').map((h) =>
      el('li', {},
        el('a', { class: 'card link-card', href: h.url, target: '_blank', rel: 'noopener' },
          el('strong', { dir: 'ltr' }, h.name, ' ↗'),
          el('span', {}, h.text),
        )))),
    el('button', { class: 'btn btn-primary btn-big cta', onclick: () => ctx.play() }, t('astro.cta')),
  );
}

function sources(ctx) {
  const c = ctx.constants;
  return el('footer', { class: 'section sources', id: 'sources' },
    el('h2', { class: 'section-title' }, t('sources.title')),
    el('p', {}, t('sources.intro')),
    el('details', {},
      el('summary', {}, t('sources.dataTitle')),
      el('p', {}, t('sources.donki')),
      el('ul', {}, Object.values(c.sources).map((s) =>
        el('li', { dir: 'ltr' }, el('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.name)))),
    ),
    el('details', {},
      el('summary', {}, t('sources.imgTitle')),
      el('p', {}, t('sources.imgNote')),
      el('ul', {}, c.images.map((i) => el('li', { dir: 'ltr' }, `${i.title} (${i.id}). Credit: ${i.credit}`))),
    ),
    el('details', {},
      el('summary', {}, t('sources.aiTitle')),
      el('p', {}, t('sources.aiText')),
    ),
    el('p', { class: 'disclaimer' }, t('sources.disclaimer')),
  );
}

export function renderPage(ctx) {
  document.getElementById('page').replaceChildren(hero(ctx), nasa(), astro(ctx), sources(ctx));
}
