// Game logic with no DOM access (PRD section 10).
// One state object; each day is step(state, decision, constants) -> new state.
//
// decision = {
//   systems: { lifeSupport: bool, greenhouse: bool, science: bool },
//   shelter: bool,      // crew hides in the storm shelter today
//   eva: bool,          // crew works outside today (more science, double dose)
// }

export const RESULT = {
  SUCCESS: 'success',
  LIFE: 'life',            // life support ran out -> mission returns safely to Earth
  RADIATION: 'radiation',  // dose budget reached -> mission returns safely to Earth
};

export function createState(constants, siteId, period = null, events = []) {
  const b = constants.balance;
  return {
    site: siteId,
    periodId: period?.id ?? null,
    day: 1,
    battery: 0,
    life: b.life.start,
    dose: 0,
    science: 0,
    reactor: false,
    events,              // [{ day, kind, ... }] from events.js
    log: [],             // one entry per finished day
    over: false,
    result: null,
  };
}

export function isNight(day, constants) {
  return day >= constants.balance.nightStartsDay;
}

// Energy the base gets today before spending (sun + reactor + stored battery).
export function energyToday(state, constants) {
  const b = constants.balance;
  const site = b.sites[state.site];
  const sun = isNight(state.day, constants) ? site.sunNight : site.sunDay;
  const reactor = state.reactor ? b.reactor.energyPerDay : 0;
  return { sun, reactor, battery: state.battery, total: sun + reactor + state.battery };
}

// Fixed costs paid before any system: water hauling and night heating.
export function upkeepToday(state, constants) {
  const site = constants.balance.sites[state.site];
  const heating = isNight(state.day, constants) ? site.heatingNight : 0;
  return { water: site.waterCost, heating, total: site.waterCost + heating };
}

export function systemCost(systems, constants, sheltered = false) {
  const c = constants.balance.systems;
  // In the shelter, greenhouse and science pause (PRD 5.3), so they cost nothing.
  return (
    (systems.lifeSupport ? c.lifeSupport : 0) +
    (systems.greenhouse && !sheltered ? c.greenhouse : 0) +
    (systems.science && !sheltered ? c.science : 0)
  );
}

export function eventsOn(state, day = state.day) {
  return state.events.filter((e) => e.day === day);
}

export function canBuyReactor(state, constants) {
  return !state.reactor && state.science >= constants.balance.reactor.cost && !state.over;
}

export function buyReactor(state, constants) {
  if (!canBuyReactor(state, constants)) return state;
  return { ...state, reactor: true, science: state.science - constants.balance.reactor.cost };
}

function eventDose(event, r) {
  if (event.kind === 'FLR') return event.level === 'X' ? r.flareX : r.flareM;
  if (event.kind === 'SEP') return r.sep;
  if (event.kind === 'CME_ARRIVAL') return r.cmeArrival;
  return 0; // CME warnings carry no dose themselves
}

// Dose the crew would get today with a given choice (shown on buttons before choosing).
export function previewDose(state, constants, { shelter = false, eva = false } = {}) {
  const r = constants.balance.radiation;
  const raw = r.surfacePerDay + eventsOn(state).reduce((sum, e) => sum + eventDose(e, r), 0);
  const factor = shelter ? r.shelterFactor : eva ? r.evaFactor : 1;
  return Math.round(raw * factor * 10) / 10;
}

// Energy plan for the dashboard: what the chosen systems would cost today.
export function planUsage(state, plan, constants) {
  const b = constants.balance;
  const energy = energyToday(state, constants);
  const upkeep = upkeepToday(state, constants);
  const systems = systemCost(plan.systems, constants, plan.shelter);
  const eva = plan.eva && !plan.shelter ? b.eva.energy : 0;
  const used = upkeep.total + systems + eva;
  return {
    energy,
    upkeep,
    used,
    left: Math.max(0, energy.total - used),
    toBattery: Math.min(b.batteryCapacity, Math.max(0, energy.total - used)),
    fits: used <= energy.total,
  };
}

export function step(state, decision, constants) {
  if (state.over) return state;
  const b = constants.balance;
  const r = b.radiation;
  const shelter = Boolean(decision.shelter);
  const want = { lifeSupport: true, greenhouse: false, science: false, ...decision.systems };

  // 1. Energy: pay upkeep first, then the EVA suits, then systems in priority order.
  const energy = energyToday(state, constants);
  let available = energy.total;
  const upkeep = upkeepToday(state, constants);
  const upkeepPaid = available >= upkeep.total;
  available = Math.max(0, available - upkeep.total);

  const eva = Boolean(decision.eva) && !shelter && canEva(state, constants) && available >= b.eva.energy;
  if (eva) available -= b.eva.energy;

  const ran = { lifeSupport: false, greenhouse: false, science: false };
  for (const key of ['lifeSupport', 'greenhouse', 'science']) {
    if (!want[key]) continue;
    if (key !== 'lifeSupport' && shelter) continue;
    const cost = b.systems[key];
    if (available >= cost) {
      ran[key] = true;
      available -= cost;
    }
  }
  const battery = Math.min(b.batteryCapacity, available);

  // 2. Life support.
  let life = state.life - b.life.dailyUse;
  if (ran.greenhouse) life += b.life.greenhouseBonus;
  if (!ran.lifeSupport) life -= b.life.unpoweredPenalty;
  if (!upkeepPaid) life -= b.unpaidUpkeepPenalty;
  life = Math.min(b.life.max, life);

  // 3. Radiation (never goes down; shelter and EVA scale the whole day's dose).
  const today = eventsOn(state);
  const rawDose = r.surfacePerDay + today.reduce((sum, e) => sum + eventDose(e, r), 0);
  const factor = shelter ? r.shelterFactor : eva ? r.evaFactor : 1;
  const doseToday = Math.round(rawDose * factor * 100) / 100;
  const dose = Math.round((state.dose + doseToday) * 100) / 100;

  // 4. Science.
  let science = state.science;
  if (ran.science) science += b.science.experiment;
  if (eva) science += b.science.eva;

  // 5. Log the day (used by the end screen: "your decisions during storms").
  const entry = {
    day: state.day,
    night: isNight(state.day, constants),
    events: today.map((e) => e.kind === 'FLR' ? `FLR-${e.level}` : e.kind),
    shelter,
    eva,
    ran,
    upkeepPaid,
    energy: { available: energy.total, left: battery },
    deltas: {
      life: life - state.life,
      dose: doseToday,
      science: science - state.science,
      battery: battery - state.battery,
    },
  };

  const next = {
    ...state,
    day: state.day + 1,
    battery,
    life,
    dose,
    science,
    log: [...state.log, entry],
  };

  // 6. End of mission.
  // On the final screen, `day` is the last day played.
  if (life <= 0) return { ...next, day: state.day, life: 0, over: true, result: RESULT.LIFE };
  if (dose >= r.missionBudget) return { ...next, day: state.day, over: true, result: RESULT.RADIATION };
  if (next.day > b.days) return { ...next, day: state.day, over: true, result: RESULT.SUCCESS };
  return next;
}

// The crew needs rest days between walks outside (concept 15: sleep).
export function canEva(state, constants) {
  const rest = constants.balance.eva.restDays;
  const recent = state.log.slice(-rest);
  return !recent.some((d) => d.eva);
}

// Stars only for a completed mission, based on science collected.
export function stars(state, constants) {
  if (state.result !== RESULT.SUCCESS) return 0;
  return constants.balance.science.stars.filter((t) => state.science >= t).length;
}

// Shown before the lunar night if the base has no way to make power in the dark.
export function needsNightWarning(state, constants) {
  const b = constants.balance;
  return (
    state.day === b.nightWarningDay &&
    !state.reactor &&
    b.sites[state.site].sunNight === 0
  );
}
