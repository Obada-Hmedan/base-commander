// Base Commander quiz (FR11). Board task 4.2.
// Answer order must be shuffled: in the bank no correct answer is option (a).

export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickQuestions(bank, count = 5, random = Math.random) {
  return shuffle(bank, random).slice(0, count);
}
