## Side effects in response to state changes

`computed` derives values. When a change should **do something** instead (fetch data, write to `localStorage`, update `document.title`, log analytics), use a watcher.

## `watch(source, callback, options?)`

`watch` observes an explicit **source** and calls the callback with the new and old values:

```ts
import { ref, watch } from 'vue';

const userId = ref(1);

watch(userId, async (newId, oldId) => {
  console.log(`changed from ${oldId} to ${newId}`);
  const response = await fetch(`/api/users/${newId}`);
  user.value = await response.json();
});
```

The source can be:

| Source | Example | Notes |
| --- | --- | --- |
| a ref (or computed) | `watch(count, ...)` | |
| a getter | `watch(() => state.page, ...)` | needed for a property of a reactive object |
| a reactive object | `watch(state, ...)` | implicitly deep |
| an array of the above | `watch([a, () => b.value], ([newA, newB]) => ...)` | callback gets arrays |

```ts
const state = reactive({ page: 1 });
watch(state.page, cb);        // ❌ passes the number 1, not something watchable
watch(() => state.page, cb);  // ✅ getter
```

### Options

- `immediate: true`: also run the callback once right away (the old value is `undefined`).
- `deep: true`: traverse nested properties so mutations deep inside trigger the callback. Since 3.5 a **number** limits the depth (`deep: 1`). Deep watching large structures is expensive.
- `once: true` (3.4+): run the callback only once, then stop.
- `flush`: when the callback runs relative to rendering (next lesson).

Watching a getter that returns an object only fires when the getter returns a **different object**; mutations inside need `deep: true`.

## `watchEffect(effect)`

`watchEffect` runs the function **immediately** and tracks every reactive value it reads, re-running whenever any of them changes. There is no separate source:

```ts
watchEffect(() => {
  document.title = `User ${userId.value}`;
});
```

| | `watch` | `watchEffect` |
| --- | --- | --- |
| Dependencies | explicit source | whatever the function reads |
| First run | lazy (unless `immediate`) | immediate |
| Old value | yes | no |
| Best for | precise control, comparing old/new | syncing several values to an effect |

**Async caveat:** `watchEffect` only tracks reads that happen **before the first `await`**. Read reactive values at the top of the function, then await.

## Stopping and pausing

Watchers created synchronously in `setup` / `<script setup>` stop automatically when the component unmounts. Both functions return a handle:

```ts
const handle = watch(source, cb);
handle.pause();  // 3.5+: stop reacting temporarily
handle.resume();
handle();        // or handle.stop(): stop for good
```

A watcher created **asynchronously** (inside a `setTimeout` or after an `await`) is not bound to the component and must be stopped manually, or it leaks.

## Prefer computed when you can

```ts
// ❌ watcher just to derive state
const fullName = ref('');
watch([first, last], () => { fullName.value = `${first.value} ${last.value}`; }, { immediate: true });

// ✅
const fullName = computed(() => `${first.value} ${last.value}`);
```

Watchers are for side effects. Deriving state with them adds an extra render and makes data flow harder to follow.

## Options API

```js
export default {
  data: () => ({ userId: 1 }),
  watch: {
    userId: { handler(newId) { this.load(newId); }, immediate: true },
    'filters.page'(page) { /* dotted path */ },
  },
};
```

`this.$watch(source, cb)` creates a watcher imperatively and returns a stop function.
