`watch(userId, async (id) => { ... }, { immediate: true })` runs once on setup and again on every change. Set `loading.value = true` at the start of each run.
---
`fetch` only rejects on network errors. Check `response.ok` yourself and `throw` when it is false so the `catch` block sets the error message.
---
Inside the watcher callback, before the first `await`: `const controller = new AbortController(); onWatcherCleanup(() => controller.abort());` then `fetch(url, { signal: controller.signal })`.
---
An aborted fetch rejects with an `AbortError`. In `catch`, `if (controller.signal.aborted) return;` so the cancelled run neither shows an error nor turns `loading` off while the newer run is still pending.
