Build a window width tracker in `App.vue` that cleans up after itself.

1. Declare a `width` ref starting at `0` and an `update()` function that copies `window.innerWidth` into it.
2. In `onMounted`, call `update()` once and register `update` as a `resize` listener on `window`.
3. In `onUnmounted` (or `onBeforeUnmount`), remove that same listener.
4. Render `<p class="width">Width: 1024px</p>` (using the current width).
