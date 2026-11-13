// Entry point: load data + language, then show the start screen.
import { loadLang } from './i18n.js';
import { showStart, showError } from './ui.js';

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
    showStart({ constants, donki });
  } catch (err) {
    console.error(err);
    showError(err);
  }
}

boot();
