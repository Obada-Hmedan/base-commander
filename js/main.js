// Entry point: load data + language, draw the page, and open the game when Play is pressed.
import { loadLang } from './i18n.js';
import { startJourney, showError } from './ui.js';
import { renderPage } from './page.js';

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.json();
}

async function boot() {
  try {
    const [constants, donki] = await Promise.all([
      loadJson('data/constants.json'),
      loadJson('data/donki-events.json'),
      loadLang(),
    ]);
    const stage = document.getElementById('stage');
    const ctx = {
      constants,
      donki,
      current: null,
      play: () => startJourney(ctx),
      onLang: () => renderPage(ctx),
      openStage: () => {
        stage.hidden = false;
        document.body.classList.add('stage-open');
        stage.scrollTo?.(0, 0);
      },
      // Close the game; optionally scroll the page to a section (e.g. 'nasa').
      closeStage: (sectionId) => {
        ctx.cancelCutscene?.();
        ctx.cancelCutscene = null;
        ctx.current = null;
        stage.hidden = true;
        document.body.classList.remove('stage-open');
        document.getElementById('app').replaceChildren();
        if (sectionId) document.getElementById(sectionId)?.scrollIntoView?.({ behavior: 'smooth' });
      },
    };
    renderPage(ctx);
  } catch (err) {
    console.error(err);
    showError(err);
  }
}

boot();
