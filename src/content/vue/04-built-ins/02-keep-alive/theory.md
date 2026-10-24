## Switching views destroys state

With `<component :is>` or `v-if`, switching away from a component **unmounts** it. Coming back creates a brand new instance: form drafts are gone, scroll positions reset, data is fetched again.

`<KeepAlive>` caches the instances of the components it wraps instead of destroying them:

```vue
<KeepAlive>
  <component :is="tabs[current]" />
</KeepAlive>
```

When you switch away, the component is **deactivated** (removed from the DOM but kept in memory). When you come back, it is **activated** with its state intact.

## Activation hooks

A cached component is not mounted/unmounted on every switch, so `onMounted` and `onUnmounted` run only once. Use the dedicated hooks instead:

```ts
import { onActivated, onDeactivated } from 'vue';

onActivated(() => {
  // runs on the first mount AND every time it is shown again
  refreshIfStale();
});

onDeactivated(() => {
  // runs when hidden, and also when finally unmounted
  pauseVideo();
});
```

Typical uses: restarting polling or timers, refreshing stale data, restoring focus. Options API equivalents are `activated()` and `deactivated()`.

## Controlling the cache

```vue
<KeepAlive include="DraftEditor,SearchPage" :max="5">
  <component :is="view" />
</KeepAlive>
```

- `include` / `exclude`: comma-separated string, RegExp or array, matched against the component **name**. With `<script setup>` the name is inferred from the file name (`DraftEditor.vue` → `DraftEditor`), or set explicitly with `defineOptions({ name })`.
- `max`: the maximum number of cached instances. When exceeded, the least recently used one is destroyed (LRU cache).

## With Vue Router

The router renders through `<RouterView>`'s slot, so KeepAlive goes inside it:

```vue
<RouterView v-slot="{ Component }">
  <KeepAlive>
    <component :is="Component" />
  </KeepAlive>
</RouterView>
```

## Pitfalls

- `<KeepAlive>` caches exactly **one direct child** at a time. Put `v-if`/`:is` on that child, not on wrappers.
- Cached components keep their watchers and memory alive. Cap with `max` when users can open many views.
- Effects that should pause while hidden (intervals, sockets, `window` listeners) must be stopped in `onDeactivated` and restarted in `onActivated`; `onUnmounted` will not run on a simple switch.
- `include` fails silently if the name does not match. Check the name in DevTools.
