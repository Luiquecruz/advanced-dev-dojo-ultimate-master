// TODO: turn ScoreEntry into the labeled tuple [player: string, score: number]
type ScoreEntry = (string | number)[];

function parseScore(line: string): ScoreEntry {
  const [player, score] = line.split(':');
  return [player, Number(score)];
}

// TODO: accept a readonly array of entries
function topPlayers(entries: ScoreEntry[], count: number): string[] {
  // TODO: sort a copy by score (highest first), keep `count` entries and return the player names
  return [];
}
