Wrap the dynamic component: `<KeepAlive><component :is="tabs[current]" /></KeepAlive>`.
---
`onActivated(() => activations.value++)` runs on the first display and every time the cached tab is shown again. `onMounted` would only run once.
