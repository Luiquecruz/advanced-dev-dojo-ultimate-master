## A component's life

Every component instance goes through the same stages: it is **created** (setup runs), **mounted** (its DOM is inserted), **updated** any number of times when reactive state changes, and finally **unmounted**. Lifecycle hooks let you run code at those moments.

```ts
import { onBeforeMount, onMounted, onBeforeUpdate, onUpdated, onBeforeUnmount, onUnmounted } from 'vue';

onMounted(() => console.log('DOM is ready'));
onUpdated(() => console.log('DOM was patched'));
onUnmounted(() => console.log('cleaned up'));
```

| Moment | Composition API | Options API |
| --- | --- | --- |
| Before/after setup | the `setup` body itself | `beforeCreate` / `created` |
| Before/after DOM insert | `onBeforeMount` / `onMounted` | `beforeMount` / `mounted` |
| Before/after re-render | `onBeforeUpdate` / `onUpdated` | `beforeUpdate` / `updated` |
| Before/after teardown | `onBeforeUnmount` / `onUnmounted` | `beforeUnmount` / `unmounted` |
| Errors in descendants | `onErrorCaptured` | `errorCaptured` |
| KeepAlive cache | `onActivated` / `onDeactivated` | `activated` / `deactivated` |

There is no `onCreated`: code written directly in `<script setup>` already runs at creation time.

## What goes where

- **Setup body**: reactive state, computed values, watchers, fetching data that does not need the DOM.
- **`onMounted`**: anything that needs the DOM or the browser: template refs, measuring elements, focusing, starting third-party widgets, `window`/`document` listeners. During server-side rendering, `onMounted` never runs, which makes it the safe place for browser-only APIs.
- **`onUnmounted` / `onBeforeUnmount`**: undo whatever `onMounted` did: remove listeners, clear timers, disconnect observers, destroy widgets.
- **`onUpdated`**: rarely needed. Prefer `watch` with `flush: 'post'` for reacting to a specific change after the DOM updates. Never mutate state in `onUpdated`: it causes another update and can loop.

## The classic leak

```ts
onMounted(() => {
  window.addEventListener('resize', update);
});
```

Without a matching removal, every mount adds a new listener that keeps the (now unmounted) component alive in memory and keeps running `update`. Always pair them, with the **same function reference**:

```ts
function update() {
  width.value = window.innerWidth;
}

onMounted(() => {
  update();
  window.addEventListener('resize', update);
});

onUnmounted(() => {
  window.removeEventListener('resize', update);
});
```

## Rules

- Hooks must be registered **synchronously** during setup. After an `await` in setup the current instance is lost and Vue warns. Register hooks before awaiting.
- Hooks can be called inside composables (that is how `useEventListener` from VueUse cleans up after itself). They attach to the component that called the composable.
- A component can register the same hook several times; they run in order.

## Options API comparison

```js
export default {
  data: () => ({ width: 0 }),
  mounted() {
    this.update();
    window.addEventListener('resize', this.update);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.update);
  },
  methods: {
    update() { this.width = window.innerWidth; },
  },
};
```

Vue 2 named the teardown hooks `beforeDestroy` and `destroyed`. Vue 3 renamed them `beforeUnmount` and `unmounted`.
