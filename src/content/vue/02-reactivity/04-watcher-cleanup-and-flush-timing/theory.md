## Side effects need cleanup

A watcher that starts asynchronous work can be triggered again before that work finishes. Typing `v`, `vu`, `vue` quickly into a search box fires three requests; if the response for `vu` arrives last, the UI shows stale results. The fix is to **cancel the previous effect** before the next one starts.

## `onWatcherCleanup()` (Vue 3.5+)

Import it from `vue` and call it **synchronously** inside a `watch` callback or a `watchEffect`. The registered function runs right before the watcher runs again, and when the watcher is stopped (for example, when the component unmounts):

```ts
import { onWatcherCleanup, ref, watch } from 'vue';

const query = ref('');
const results = ref([]);

watch(query, async (q) => {
  const controller = new AbortController();
  onWatcherCleanup(() => controller.abort());

  try {
    const response = await fetch(`/api/products?q=${q}`, { signal: controller.signal });
    results.value = await response.json();
  } catch (error) {
    if ((error as Error).name !== 'AbortError') throw error;
  }
});
```

Rule: register cleanups **before the first `await`**. After an `await`, Vue no longer knows which watcher is running and `onWatcherCleanup` warns.

### The older `onCleanup` argument

Before 3.5 (and still supported), the cleanup registrar is passed as an argument. It is bound to its watcher, so it also works after `await`:

```ts
watch(id, async (newId, oldId, onCleanup) => {
  let cancelled = false;
  onCleanup(() => { cancelled = true; });
  const data = await load(newId);
  if (!cancelled) user.value = data;
});

watchEffect((onCleanup) => { /* ... */ });
```

Typical cleanups: aborting `fetch`, clearing timers, removing event listeners, closing WebSockets or subscriptions.

## Flush timing

When state changes, Vue does not run watchers and re-render immediately; it queues jobs and flushes them in the next microtask. The `flush` option decides where a watcher sits in that queue:

| `flush` | Runs | Sees the DOM |
| --- | --- | --- |
| `'pre'` (default) | before the component re-renders | **old** DOM |
| `'post'` | after the component re-renders | **updated** DOM |
| `'sync'` | synchronously on every change, no batching | old DOM |

```ts
const list = ref<HTMLUListElement | null>(null); // template ref: <ul ref="list">

watch(items, () => {
  list.value!.lastElementChild?.scrollIntoView(); // needs the new <li> to exist
}, { flush: 'post' });
```

Shortcuts: `watchPostEffect(fn)` = `watchEffect(fn, { flush: 'post' })`, `watchSyncEffect(fn)` = `{ flush: 'sync' }`.

Use `'post'` whenever the watcher reads layout or DOM produced by the same change: measuring sizes, scrolling, focusing a new element, integrating a non-Vue library that wraps the DOM. Use `'sync'` sparingly: it runs once per mutation (pushing 100 items runs it 100 times) and can cause inconsistent intermediate states.

### `nextTick()` vs `flush: 'post'`

`await nextTick()` waits for the current flush to finish. It is fine for one-off code ("after I set this, focus the input"). For a **recurring** reaction to state, `flush: 'post'` expresses the intent directly.

## Stopping watchers

Watchers created synchronously in setup stop when the component unmounts, running their cleanups. `onWatcherCleanup` therefore also prevents work from finishing after the component is gone (no "state update on unmounted component" surprises).

## Options API

```js
export default {
  watch: {
    query: { handler: 'search', flush: 'post' },
  },
};
```

`this.$watch(source, (value, oldValue, onCleanup) => { ... })` exposes the same `onCleanup` argument.
