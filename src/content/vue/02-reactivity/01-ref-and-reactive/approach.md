1. Turn `score` into `ref(0)` and `player` into `reactive({...})`, keeping the same initial data.
2. Keep `{{ score }}` in the template: top-level refs are unwrapped there, so no `.value` is needed.
3. In `addPoints`, increment `score.value` and push into `player.history`.
4. In `resetGame`, set `score.value = 0` and empty the history by mutating the existing array or property.
