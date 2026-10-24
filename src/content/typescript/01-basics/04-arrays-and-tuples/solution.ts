type ScoreEntry = [player: string, score: number];

function parseScore(line: string): ScoreEntry {
  const [player, score] = line.split(':');
  return [player, Number(score)];
}

function topPlayers(entries: readonly ScoreEntry[], count: number): string[] {
  return entries
    .toSorted(([, first], [, second]) => second - first)
    .slice(0, count)
    .map(([player]) => player);
}
