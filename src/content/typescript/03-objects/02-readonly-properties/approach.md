1. Add `readonly` to every property of `Coordinates` and `Route`.
2. Change the type of `stops` to `readonly Coordinates[]`.
3. Rewrite `moveNorth` and `addStop` to build new objects with the spread operator. The compiler now rejects the old mutations.
