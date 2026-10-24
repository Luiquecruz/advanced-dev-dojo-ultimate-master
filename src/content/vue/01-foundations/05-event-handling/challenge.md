Wire the events of `App.vue` using **modifiers** instead of calling `preventDefault()`/`stopPropagation()` manually.

1. The `<form>` must call `submit` on `submit` **with `.prevent`**. Each submit increments `submissions`, displayed as `Submitted 1 times`.
2. The `<div class="card">` increments `cardClicks` on click. The `Like` button inside it increments `likes` and must **not** count as a card click (`.stop`).
3. The `Claim bonus` button adds `10` to `bonus` **only the first time** it is clicked (`.once`).
4. Pressing **Enter** in the tag `<input>` calls `addTag` (`@keyup.enter` or `@keydown.enter`), which adds the trimmed input text to `tags` (rendered as `<li>`) and clears the input.

All state and the text output are already in the starter. Implement `addTag` and add the listeners.
