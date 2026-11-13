// Language loading and switching (FR10).
// Arabic is RTL, English is LTR. The choice is saved in localStorage,
// always inside try/catch because storage can be blocked.

const STORAGE_KEY = 'base-commander.lang';
const SUPPORTED = ['ar', 'en'];

let strings = {};
let current = 'ar';

function readSavedLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED.includes(saved) ? saved : null;
  } catch {
    return null;
  }
}

function saveLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage unavailable: the game still works, the choice just isn't remembered.
  }
}

export async function loadLang(lang = readSavedLang() ?? 'ar') {
  const res = await fetch(`i18n/${lang}.json`);
  if (!res.ok) throw new Error(`Could not load i18n/${lang}.json`);
  strings = await res.json();
  current = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = t('app.title');
  saveLang(lang);
}

export function currentLang() {
  return current;
}

export function otherLang() {
  return current === 'ar' ? 'en' : 'ar';
}

// t('start.title') or t('hud.day', { day: 3 })
export function t(key, vars = {}) {
  const value = key.split('.').reduce((obj, part) => obj?.[part], strings);
  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? `{${name}}`);
}

// Raw value (arrays/objects) for page content lists.
export function raw(key) {
  return key.split('.').reduce((obj, part) => obj?.[part], strings);
}
