Build a scoreboard in `App.vue`.

1. Declare `score` with **`ref(0)`** and `player` with **`reactive({ name: 'Ada', history: [] as number[] })`**.
2. Implement `addPoints(points: number)` in `<script setup>`: add `points` to `score` and push `points` into `player.history`.
3. Implement `resetGame()`: set the score back to `0` and empty `player.history` **without replacing the `player` object**.
4. The template (already written) shows `<h2>Ada: 6</h2>`, one `<li>` per history entry and the `+1`, `+5` and `Reset` buttons wired to your functions.
