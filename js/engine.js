// Game logic with no DOM access (section 10).
// One state object; each day is step(state, decision) -> new state.
// Board tasks 2.2-2.5 fill this in once the balance numbers are locked (tasks 1.1-1.3).

export function createState(constants, siteId) {
  const b = constants.balance;
  return {
    site: siteId,
    day: 1,
    battery: 0,
    life: b.life.start,
    dose: 0,
    science: 0,
    reactor: false,
    log: [],
    over: false,
  };
}

export function isNight(state, constants) {
  return state.day >= constants.balance.nightStartsDay;
}

// TODO(2.3, 2.4): energy, life support, radiation and science for one day.
// TODO(2.5): win/lose check and decision log.
export function step(state, decision, constants) {
  return { ...state, day: state.day + 1, log: [...state.log, { day: state.day, decision }] };
}
