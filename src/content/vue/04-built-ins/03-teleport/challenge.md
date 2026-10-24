Build a `ModalDialog.vue` that escapes a clipped container.

**`ModalDialog.vue`**

1. Props: `open: boolean` and `title: string`. Emits: `close`.
2. Use `<Teleport to="body">` and inside it, only when `open` is true, render `<div class="backdrop">` containing `<div role="dialog" aria-modal="true" :aria-label="title">` with an `<h2>` (title), a default slot and a `Close` button.
3. Emit `close` when the `Close` button is clicked, when `Escape` is pressed inside the dialog, and when the backdrop itself (not its content) is clicked.

**`App.vue`** (already written) renders the modal inside `.card` (which has `overflow: hidden`) and toggles it with an `Open dialog` button.
