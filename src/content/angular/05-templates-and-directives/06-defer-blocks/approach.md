1. Decide what can wait: reviews only matter after a click, recommendations can arrive when the browser is idle.
2. Wrap `<app-reviews />` in `@defer` with an `on interaction(reviewsTrigger)` trigger and add `prefetch on idle` so the code is ready before the click.
3. Add `@placeholder`, `@loading (minimum 200ms)` and `@error` blocks with the exact texts.
4. Wrap `<app-recommendations />` in a second `@defer (on idle)` with its placeholder.
5. Keep both components in `imports`; since they are only used inside `@defer`, a real build would split them into lazy chunks.
