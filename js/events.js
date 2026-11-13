// Maps archived DONKI events onto game days (FR5, FR6).
// Every event shown to the child is a real DONKI record with its real date.

export function pickPeriod(donki, random = Math.random) {
  if (!donki?.periods?.length) return null;
  return donki.periods[Math.floor(random() * donki.periods.length)];
}

// Turns a DONKI period into the game's event list.
//  - Days 1..tutorialDays stay calm so the child can learn the controls;
//    events from those days move to the first day after the tutorial.
//  - At most one solar event per day (the fetch script already keeps the strongest).
//  - A fast CME is an early warning; its arrival lands 1-3 days later on a free day.
export function scheduleEvents(period, constants, random = Math.random) {
  if (!period) return [];
  const b = constants.balance;
  const firstDay = b.tutorialDays + 1;
  const [minDelay, maxDelay] = b.cmeDelayDays;
  const byDay = new Map();

  const place = (event, wantedDay) => {
    let day = Math.max(firstDay, wantedDay);
    while (byDay.has(day) && day <= b.days) day++;
    if (day <= b.days) byDay.set(day, { ...event, day });
  };

  // Keep the strongest events only, so a child is not interrupted every single day.
  const SEVERITY = { SEP: 4, X: 3, CME: 2, M: 1 };
  const severity = (e) => SEVERITY[e.kind === 'FLR' ? e.level : e.kind] ?? 0;
  const chosen = [...period.events]
    .sort((x, y) => severity(y) - severity(x) || x.day - y.day)
    .slice(0, b.maxEventsPerRound)
    .sort((x, y) => x.day - y.day);

  for (const e of chosen) {
    if (e.kind === 'CME') {
      const delay = minDelay + Math.floor(random() * (maxDelay - minDelay + 1));
      place({ ...e, kind: 'CME' }, e.day);
      const warnDay = [...byDay.values()].find((x) => x.id === e.id)?.day;
      if (warnDay) place({ ...e, kind: 'CME_ARRIVAL', warnedOn: warnDay }, warnDay + delay);
    } else {
      place(e, e.day);
    }
  }

  return [...byDay.values()].sort((a, b2) => a.day - b2.day);
}

// Mars level: a short scripted scenario (NOT archived data; shown as "simplified scenario").
// It teaches two real ideas: signals take minutes to reach Mars, and dust storms can last a long time.
export function marsEvents(constants) {
  const s = constants.balance.script;
  const events = [
    { day: s.faultDay, kind: 'FAULT', scripted: true },
    { day: s.dustWarnDay, kind: 'DUST_WARN', scripted: true },
    ...s.dustDays.map((day) => ({ day, kind: 'DUST', scripted: true })),
    { day: s.stormDay, kind: 'SEP', scripted: true },
  ];
  return events.sort((a, b) => a.day - b.day);
}
