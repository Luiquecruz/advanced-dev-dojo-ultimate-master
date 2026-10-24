## Plugins

A Pinia plugin is a function that runs **once for every store** when that store is first used. It receives a context and can add properties, wrap actions or react to changes:

```ts
import type { PiniaPluginContext } from 'pinia';

export function loggerPlugin({ store, options, pinia, app }: PiniaPluginContext) {
  store.$onAction(({ name, args, after, onError }) => {
    const startedAt = performance.now();
    after(() => console.log(`${store.$id}.${name}`, args, performance.now() - startedAt));
    onError((error) => console.error(`${store.$id}.${name} failed`, error));
  });
}

const pinia = createPinia();
pinia.use(loggerPlugin);
app.use(pinia);
```

### The store API plugins use

| API | Purpose |
| --- | --- |
| `store.$id` | the store id passed to `defineStore` |
| `store.$state` | the whole state object |
| `store.$patch(partial \| fn)` | apply several changes as one mutation |
| `store.$subscribe(cb, { flush, detached })` | called after state changes, with `(mutation, state)` |
| `store.$onAction(cb)` | called before each action, with `after` / `onError` hooks |
| `options` | the options passed to `defineStore`, including custom ones |

Returning an object from a plugin adds its properties to every store (`return { $createdAt: Date.now() }`). Type them by augmenting `PiniaCustomProperties`.

### Custom store options

Plugins often read a custom option. Declare it once so both syntaxes type-check:

```ts
declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: boolean;
  }
}

defineStore('settings', { state: () => ({ theme: 'light' }), persist: true });
defineStore('recent', () => { /* ... */ }, { persist: true }); // setup store: 3rd argument
```

### Timing: `flush`

`$subscribe` uses `flush: 'pre'` by default, like a watcher: several synchronous mutations trigger one callback before the next render. Use `flush: 'sync'` when the side effect must happen immediately, at the cost of running on every single mutation.

Community plugins like `pinia-plugin-persistedstate` implement exactly this idea with more options (storage, paths, serializers).

## Testing stores

### Unit tests: a fresh Pinia per test

```ts
import { createPinia, setActivePinia } from 'pinia';

beforeEach(() => {
  setActivePinia(createPinia());
});

it('adds items', () => {
  const cart = useCartStore();
  cart.addItem('Mouse', 45);
  expect(cart.total).toBe(45);
});
```

`setActivePinia` lets `useCartStore()` work outside components. A new Pinia per test means no state leaks between tests.

**Plugins need an app.** `pinia.use()` queues plugins until Pinia is installed with `app.use(pinia)`. When a unit test relies on a plugin, install Pinia into a throwaway app:

```ts
const pinia = createPinia().use(persistPlugin);
createApp({}).use(pinia);
setActivePinia(pinia);
```

### Component tests: `@pinia/testing`

The official `@pinia/testing` package provides `createTestingPinia`, which **stubs every action** with spies by default and lets you set initial state:

```ts
import { createTestingPinia } from '@pinia/testing';

const wrapper = mount(Cart, {
  global: {
    plugins: [createTestingPinia({ createSpy: vi.fn, initialState: { cart: { items: [] } } })],
  },
});
const cart = useCartStore();            // uses the testing pinia
await wrapper.get('button').trigger('click');
expect(cart.addItem).toHaveBeenCalledWith('Mouse', 45);
```

Pass `stubActions: false` to run the real actions. Getters are writable in testing Pinia, so you can force `cart.total = 999` to test a rendering edge case.

## Legacy vs modern

Vuex plugins received the store and subscribed to *mutations* (`store.subscribe((mutation, state) => ...)`); testing usually meant building a full store with `new Vuex.Store`. Pinia has no mutations: plugins observe state with `$subscribe` and actions with `$onAction`, and stores are tested as plain functions. Pinia 3 removed the deprecated `PiniaStorePlugin` type (use `PiniaPlugin`), and Pinia 4 is ESM-only with `@vue/devtools-api` v8 as a peer dependency.
