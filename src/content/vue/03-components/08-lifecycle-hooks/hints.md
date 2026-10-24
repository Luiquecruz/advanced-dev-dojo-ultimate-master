`update` is just `width.value = window.innerWidth`.
---
Register the listener in `onMounted(() => { update(); window.addEventListener('resize', update); })`. Accessing `window` there is safe even with server-side rendering.
---
`removeEventListener` only works with the **same function reference** you added, so pass `update` again inside `onUnmounted`.
