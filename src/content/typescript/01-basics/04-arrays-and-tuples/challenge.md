Build a small scoreboard with tuples and readonly arrays.

1. Change `ScoreEntry` into a **labeled tuple**: `[player: string, score: number]`.
2. Implement `parseScore(line: string): ScoreEntry`. The input has the format `"<player>:<score>"`.
   ```ts
   parseScore('ada:42'); // ['ada', 42]
   ```
3. Implement `topPlayers(entries: readonly ScoreEntry[], count: number): string[]`. It returns the names of the `count` players with the highest scores, highest first, and must **not** mutate `entries`.
   ```ts
   topPlayers([['ada', 42], ['alan', 99], ['grace', 70]], 2); // ['alan', 'grace']
   ```
