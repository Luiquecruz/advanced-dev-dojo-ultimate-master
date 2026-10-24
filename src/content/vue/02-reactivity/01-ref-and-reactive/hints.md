Replace the plain objects with `ref(0)` and `reactive({ ... })`. Plain objects are not tracked, so the screen never updates.
---
In script code a ref needs `.value` (`score.value += points`), a reactive object does not (`player.history.push(points)`). In the template, top-level refs are unwrapped, so `{{ score }}` is enough.
---
To clear the history in place use `player.history.length = 0` or `player.history.splice(0)`. Assigning `player.history = []` also works because it sets a property on the proxy; reassigning `player` itself does not.
