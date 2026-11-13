#!/usr/bin/env node
// Plays automatic 30-day rounds to check game balance (board task 2.5).
// Usage: node scripts/simulate.mjs

import { readFileSync } from 'node:fs';
import { createState, step, stars, energyToday, upkeepToday, buyReactor, canBuyReactor, eventsOn, isNight } from '../js/engine.js';
import { scheduleEvents } from '../js/events.js';

const constants = JSON.parse(readFileSync(new URL('../data/constants.json', import.meta.url)));
const donki = JSON.parse(readFileSync(new URL('../data/donki-events.json', import.meta.url)));
const b = constants.balance;

// Seeded random so runs are repeatable.
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

const isDanger = (e) => ['FLR', 'SEP', 'CME_ARRIVAL'].includes(e.kind);

// Turn on as many systems as today's energy allows, in priority order.
function autoSystems(state) {
  let left = energyToday(state, constants).total - upkeepToday(state, constants).total;
  const systems = {};
  for (const key of ['lifeSupport', 'greenhouse', 'science']) {
    systems[key] = left >= b.systems[key];
    if (systems[key]) left -= b.systems[key];
  }
  // At night keep a little battery for life support instead of science.
  if (isNight(state.day, constants) && systems.science && left < b.systems.lifeSupport) systems.science = false;
  return systems;
}

const STRATEGIES = {
  // Shelters on every dangerous event, buys the reactor when it can before night.
  careful: (s) => {
    if (s.day <= 15 && canBuyReactor(s, constants) && b.sites[s.site].sunNight === 0) s = buyReactor(s, constants);
    return [s, { systems: autoSystems(s), shelter: eventsOn(s).some(isDanger), eva: false }];
  },
  // Never shelters, does EVAs on calm days.
  reckless: (s) => [s, { systems: autoSystems(s), shelter: false, eva: eventsOn(s).length === 0 }],
  // Shelters only for X flares and particles.
  balanced: (s) => {
    if (s.day <= 15 && canBuyReactor(s, constants) && b.sites[s.site].sunNight === 0) s = buyReactor(s, constants);
    const big = eventsOn(s).some((e) => e.kind === 'SEP' || (e.kind === 'FLR' && e.level === 'X'));
    return [s, { systems: autoSystems(s), shelter: big, eva: !big && eventsOn(s).length === 0 && s.day % 5 === 0 }];
  },
};

console.log('period'.padEnd(18), 'site'.padEnd(7), 'strategy'.padEnd(9), 'result'.padEnd(10), 'day', ' life', '  dose', 'sci', 'stars');
for (const period of donki.periods) {
  for (const site of ['rim', 'shadow']) {
    for (const [name, play] of Object.entries(STRATEGIES)) {
      const events = scheduleEvents(period, constants, rng(42));
      let s = createState(constants, site, period, events);
      while (!s.over) {
        const [s2, decision] = play(s);
        s = step(s2, decision, constants);
      }
      console.log(
        period.id.padEnd(18), site.padEnd(7), name.padEnd(9), s.result.padEnd(10),
        String(s.day).padStart(3), String(s.life).padStart(5), String(s.dose.toFixed(0)).padStart(6),
        String(s.science).padStart(3), '⭐'.repeat(stars(s, constants)) || '-',
      );
    }
  }
}
