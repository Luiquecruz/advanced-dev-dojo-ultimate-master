## Fetching data in a component

Vue has no built-in data fetching API: you call `fetch` (or a client like `ofetch`/`axios`) and store the result in refs. Every remote resource has at least three states, and the UI should show exactly one of them at a time:

```ts
const data = ref<Post[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
```

```vue
<p v-if="loading">Loading…</p>
<p v-else-if="error" role="alert">{{ error }}</p>
<ul v-else>...</ul>
```

### Fetch once on mount

```ts
onMounted(async () => {
  loading.value = true;
  const response = await fetch('/api/users');
  users.value = await response.json();
  loading.value = false;
});
```

Note that a top-level `await` in `<script setup>` makes the component **async**: it only renders inside `<Suspense>`. Kick off requests from a hook or a watcher instead unless you use Suspense on purpose.

### `fetch` does not reject on HTTP errors

`fetch` only rejects on network failures. A `404` or `500` resolves normally, so always check `response.ok`:

```ts
const response = await fetch(url);
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
```

## Refetching when inputs change

When the request depends on reactive state (a route param, a filter, a search box), use a watcher with `immediate: true` so it also runs on setup:

```ts
watch(userId, async (id) => {
  posts.value = await (await fetch(`/api/posts?userId=${id}`)).json();
}, { immediate: true });
```

### The race condition

If the user switches from author 1 to author 2 quickly, two requests are in flight. Responses can arrive **out of order**: if the request for author 1 is slower, it lands last and overwrites author 2's posts. The UI now lies.

### Cancelling with AbortController + onWatcherCleanup

Vue 3.5 added `onWatcherCleanup()`. The callback you register runs right before the watcher runs again (and when the watcher stops, e.g. on unmount). Pair it with an `AbortController`:

```ts
watch(userId, async (id) => {
  const controller = new AbortController();
  onWatcherCleanup(() => controller.abort());

  try {
    const response = await fetch(`/api/posts?userId=${id}`, { signal: controller.signal });
    posts.value = await response.json();
  } catch (error) {
    if (controller.signal.aborted) return; // superseded, not a real failure
    errorMessage.value = 'Could not load posts.';
  }
}, { immediate: true });
```

Aborting does two things: the browser stops the network request, and the pending `fetch` rejects with an `AbortError`, so the stale run can never write its result.

**Pitfall:** `onWatcherCleanup` must be called *synchronously*, before the first `await`. After an `await` Vue no longer knows which watcher is active. The older alternative, still valid and safe after `await`, is the third argument of the callback: `watch(source, async (value, oldValue, onCleanup) => { onCleanup(() => controller.abort()); })`.

## Extracting a composable

Once you write this twice, move it into a composable such as `useFetch(url)` that accepts a ref or getter (`MaybeRefOrGetter`) and returns `{ data, error, loading }`. Use `toValue(url)` inside `watchEffect` so the composable reacts to changes.

## When to reach for a library

Hand-written fetching is fine for a few screens. Once you need caching, deduplication, background refetching, retries or pagination, a server-state library such as **TanStack Vue Query** (next lesson) or **Pinia Colada** removes most of this code. In Nuxt, `useFetch`/`useAsyncData` also handle SSR hydration.
