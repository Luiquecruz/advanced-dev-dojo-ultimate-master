## Deep reactivity has a cost

`ref()` and `reactive()` are **deep**: every nested object you access is wrapped in its own Proxy, and every property read is tracked. That is convenient, but for some data it is wasted work:

- large arrays of immutable records (10 000 rows from an API, chart points);
- instances of third-party classes (map engines, editors, chart libraries) that manage their own state and break when proxied;
- objects passed to APIs that do not accept Proxies (`structuredClone`, `postMessage`, IndexedDB).

Vue gives you escape hatches for these cases.

## `shallowRef()` and `triggerRef()`

A `shallowRef` only tracks **`.value` assignment**. The value itself is stored as is, without a Proxy:

```ts
import { shallowRef, triggerRef } from 'vue';

const rows = shallowRef<Row[]>([]);

rows.value.push(row);        // ❌ not tracked, nothing updates
rows.value = [...rows.value, row]; // ✅ new array, dependents update

rows.value[0].name = 'Ada';  // ❌ not tracked...
triggerRef(rows);            // ✅ ...until you force an update
```

Two styles work with shallow refs:

1. **Immutable updates** (replace the value): pairs well with data from APIs and libraries like Immer.
2. **Mutate, then `triggerRef(ref)`**: avoids copying a huge array when you know you changed it.

The Vue docs recommend `shallowRef` for large data structures, and Vue 3.5's reactivity refactor made deep arrays cheaper, but shallow is still the fastest option for big immutable lists.

## `shallowReactive()` and `shallowReadonly()`

`shallowReactive(obj)` tracks only **root-level** properties: `state.list = [...]` triggers, `state.list.push(x)` does not. Nested values are stored raw. `shallowReadonly` freezes only the root level. Use them rarely and keep such objects at the edges (for example, component-level state that wraps external objects).

## `markRaw()`

`markRaw(obj)` flags an object so Vue **never** converts it to a Proxy, even when it is placed inside reactive state:

```ts
import { markRaw, reactive } from 'vue';
import { Map as MapLibre } from 'maplibre-gl';

const state = reactive({
  zoom: 4,
  map: markRaw(new MapLibre({ container: 'map' })),
});

state.zoom = 5;           // reactive
state.map.flyTo({ ... }); // the real instance, not a Proxy
```

Without `markRaw`, Vue would wrap the instance: private fields (`#state`) throw on Proxy access, identity checks fail (`instance === proxy` is false), and every internal property read is tracked for nothing.

## `toRaw()`

`toRaw(proxy)` returns the original object behind a `reactive`, `readonly` or `shallowReactive` proxy:

```ts
const settings = reactive({ theme: 'dark' });

structuredClone(settings);        // ❌ DataCloneError: Proxies cannot be cloned
structuredClone(toRaw(settings)); // ✅ deep, plain copy
```

Use it for temporary reads and writes that should not track or trigger, or to hand data to non-Vue code. Do not keep the raw object around and mutate it as your "real" state: changes made to the raw object are invisible to Vue.

Note that `toRaw` is shallow: nested objects of the raw object are plain, because Vue only creates nested proxies on access.

## Identity pitfalls

```ts
const raw = {};
const proxy = reactive(raw);

proxy === raw;              // false
reactive(raw) === proxy;    // true (cached)
toRaw(proxy) === raw;       // true
list.value.includes(raw);   // Vue patches includes/indexOf to also search raw values
```

When comparing objects you got from reactive state and from outside, normalize with `toRaw` on both sides.

## Inspection helpers

`isRef`, `isReactive`, `isReadonly`, `isProxy` and `isShallow` tell you what you are dealing with. They are handy in tests and in utilities that accept "maybe reactive" input.

## Summary

| Need | Use |
| --- | --- |
| Big list replaced as a whole | `shallowRef` |
| Big list mutated in place | `shallowRef` + `triggerRef` |
| External class instance in state | `markRaw` |
| Plain copy / pass to non-Vue API | `toRaw` (then clone) |
