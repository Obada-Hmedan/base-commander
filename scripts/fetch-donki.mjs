#!/usr/bin/env node
// Downloads real solar events from NASA's DONKI (CCMC) and saves an archive
// the game can use offline: data/donki-events.json
//
// Usage:
//   node scripts/fetch-donki.mjs
//
// Each "period" is a 30-day window = one game round (one lunar day + night).
// The game picks one period at random, so every round replays real space weather.
// Everything saved here is ARCHIVED data and must be labelled that way in the game.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = resolve(ROOT, 'data/donki-events.json');

// DONKI moved to new URLs on 30 Sep 2026. Try the new host first, the old one as backup.
const HOSTS = [
  'https://ccmc.gsfc.nasa.gov/DONKI/WS/get',
  'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get',
];

// 30-day windows, from calm to very active. Difficulty is recomputed from the real counts.
// Each window was checked to contain at least one real event (PRD: one real event per round).
const PERIODS = [
  { id: 'quiet-2020-05', label: { ar: 'شمس هادية (مايو 2020)', en: 'Quiet Sun (May 2020)' }, start: '2020-05-20' },
  { id: 'waking-2021-05', label: { ar: 'الشمس بتصحى (مايو 2021)', en: 'Waking Sun (May 2021)' }, start: '2021-05-01' },
  { id: 'first-x-2021-07', label: { ar: 'أول توهج X (يوليو 2021)', en: 'First X flare (July 2021)' }, start: '2021-07-01' },
  { id: 'busy-2023-02', label: { ar: 'شمس نشيطة (فبراير 2023)', en: 'Busy Sun (February 2023)' }, start: '2023-02-01' },
  { id: 'storm-2024-05', label: { ar: 'العاصفة الكبرى (مايو 2024)', en: 'The Great Storm (May 2024)' }, start: '2024-05-01' },
];

// When several events happen on the same day, the game shows only the strongest one,
// so a child sees at most one solar event per day.
const SEVERITY = { SEP: 4, X: 3, CME: 2, M: 1 };
const severity = (e) => SEVERITY[e.kind === 'FLR' ? e.level : e.kind];

function strongestPerDay(events) {
  const byDay = new Map();
  for (const e of events) {
    const current = byDay.get(e.day);
    if (!current || severity(e) > severity(current)) byDay.set(e.day, e);
  }
  return [...byDay.values()].sort((a, b) => a.day - b.day);
}

const DAYS = 30;

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayIndex(periodStart, isoTime) {
  const start = Date.parse(`${periodStart}T00:00:00Z`);
  return Math.floor((Date.parse(isoTime) - start) / 86_400_000) + 1; // 1-based game day
}

async function getJson(type, startDate, endDate) {
  let lastError;
  for (const host of HOSTS) {
    const url = `${host}/${type}?startDate=${startDate}&endDate=${endDate}`;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        return { data: text.trim() ? JSON.parse(text) : [], url };
      } catch (err) {
        lastError = new Error(`${url}: ${err.cause?.code ?? err.message}`);
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError;
}

// Solar flares: class letter decides the dose in the game (M or X; C and below are harmless).
function mapFlares(list, start) {
  return list
    .filter((f) => /^[MX]/.test(f.classType ?? ''))
    .map((f) => ({
      kind: 'FLR',
      id: f.flrID,
      day: dayIndex(start, f.peakTime ?? f.beginTime),
      time: f.peakTime ?? f.beginTime,
      class: f.classType,
      level: f.classType.startsWith('X') ? 'X' : 'M',
      link: f.link,
    }));
}

// Solar energetic particles: the most dangerous event for astronauts.
function mapSep(list, start) {
  return list.map((s) => ({
    kind: 'SEP',
    id: s.sepID,
    day: dayIndex(start, s.eventTime),
    time: s.eventTime,
    link: s.link,
  }));
}

// Coronal mass ejections: shown as an early warning ("may arrive in 1–3 days").
function mapCme(list, start) {
  return list
    .map((c) => {
      const analysis = c.cmeAnalyses?.find((a) => a.isMostAccurate) ?? c.cmeAnalyses?.[0];
      return {
        kind: 'CME',
        id: c.activityID,
        day: dayIndex(start, c.startTime),
        time: c.startTime,
        speedKmS: analysis?.speed ?? null,
        link: c.link,
      };
    })
    // Keep only fast CMEs (>= 700 km/s) so warnings stay meaningful for kids.
    .filter((c) => c.speedKmS && c.speedKmS >= 700);
}

// Scored on the per-day events the child will actually face.
function difficulty(events) {
  const score = events.reduce((sum, e) => sum + severity(e), 0);
  if (score <= 4) return 'easy';
  if (score <= 15) return 'medium';
  return 'hard';
}

function countByKind(events) {
  return {
    flareM: events.filter((e) => e.kind === 'FLR' && e.level === 'M').length,
    flareX: events.filter((e) => e.kind === 'FLR' && e.level === 'X').length,
    sep: events.filter((e) => e.kind === 'SEP').length,
    cme: events.filter((e) => e.kind === 'CME').length,
  };
}

async function fetchPeriod(p) {
  const end = addDays(p.start, DAYS - 1);
  const [flr, sep, cme] = await Promise.all([
    getJson('FLR', p.start, end),
    getJson('SEP', p.start, end),
    getJson('CME', p.start, end),
  ]);
  const all = [
    ...mapFlares(flr.data, p.start),
    ...mapSep(sep.data, p.start),
    ...mapCme(cme.data, p.start),
  ].filter((e) => e.day >= 1 && e.day <= DAYS);

  const events = strongestPerDay(all);

  return {
    id: p.id,
    label: p.label,
    startDate: p.start,
    endDate: end,
    difficulty: difficulty(events),
    // Everything DONKI recorded in this window (for "In reality..." cards).
    realCounts: countByKind(all),
    // What the child plays: at most one event per day.
    gameCounts: countByKind(events),
    events,
  };
}

async function main() {
  const periods = [];
  for (const p of PERIODS) {
    process.stdout.write(`Fetching ${p.id} ... `);
    try {
      const period = await fetchPeriod(p);
      periods.push(period);
      const g = period.gameCounts;
      const r = period.realCounts;
      console.log(
        `${period.difficulty}: game M=${g.flareM} X=${g.flareX} SEP=${g.sep} CME=${g.cme}` +
          ` (real M=${r.flareM} X=${r.flareX} SEP=${r.sep} CME=${r.cme})`,
      );
    } catch (err) {
      console.log(`FAILED (${err.message})`);
    }
  }

  if (periods.length === 0) {
    console.error('No period could be downloaded. The existing file was left unchanged.');
    process.exit(1);
  }

  const archive = {
    _note: 'ARCHIVED data from NASA DONKI (CCMC). Show it as archived with its dates, never as live.',
    source: 'NASA Space Weather Database Of Notifications, Knowledge, Information (DONKI), CCMC',
    sourceUrl: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
    fetchedAt: new Date().toISOString(),
    daysPerPeriod: DAYS,
    periods,
  };

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(archive, null, 2) + '\n');
  console.log(`Saved ${periods.length} period(s) to ${OUT_FILE}`);
}

main();
