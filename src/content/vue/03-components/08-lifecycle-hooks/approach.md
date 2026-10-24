1. Implement `update` by reading `window.innerWidth`.
2. In `onMounted`, call it once so the initial width is shown, then add the `resize` listener.
3. In `onUnmounted`, remove the listener with the same function reference.
4. The template already interpolates `width`.
