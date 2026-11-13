// Maps archived DONKI events onto game days (FR5, FR6). Board task 2.6.

export function pickPeriod(donki, random = Math.random) {
  if (!donki?.periods?.length) return null;
  return donki.periods[Math.floor(random() * donki.periods.length)];
}

// TODO(2.6): turn a period's FLR / SEP / CME events into { day, type, choices } entries.
export function scheduleEvents(period, totalDays) {
  return [];
}
