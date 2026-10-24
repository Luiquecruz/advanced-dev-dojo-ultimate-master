## Where Vuex came from

**Vuex** was Vue's official state management library from 2016 until 2022, inspired by Flux and Redux. Vuex 3 served Vue 2 and Vuex 4 ported the same API to Vue 3. It is now in **maintenance mode**: it still works, but receives no new features, and the Vue team recommends **Pinia** for new projects. Pinia started as an experiment for "Vuex 5" and became that next version under a new name.

You will still meet Vuex in many existing codebases, so it is worth reading fluently.

## The Vuex model

```js
import { createStore } from 'vuex';

export const store = createStore({
  state: () => ({ count: 0, items: [] }),
  getters: {
    double: (state) => state.count * 2,
  },
  mutations: {                       // synchronous, the only way to change state
    increment(state, amount) {
      state.count += amount;
    },
    setItems(state, items) {
      state.items = items;
    },
  },
  actions: {                         // async work, then commit mutations
    async loadItems({ commit }) {
      const items = await api.getItems();
      commit('setItems', items);
    },
  },
});

app.use(store);
```

In components:

```js
// Options API
computed: { ...mapState(['count']), ...mapGetters(['double']) },
methods: { ...mapMutations(['increment']), ...mapActions(['loadItems']) },

// Composition API
const store = useStore();
store.commit('increment', 1);
store.dispatch('loadItems');
const double = computed(() => store.getters.double);
```

### Modules

Large stores were split into **modules**, optionally `namespaced: true`, and accessed with string paths:

```js
store.dispatch('cart/checkout');
store.getters['cart/total'];
...mapActions('cart', ['checkout'])
```

## Pain points Pinia removed

| Vuex | Pinia |
| --- | --- |
| `mutations` + `actions` | only `actions` (sync or async); devtools still track changes |
| one root store with nested modules | many flat stores, each a `defineStore` |
| string-based `commit('cart/add')` | direct method calls: `cart.add()` |
| weak TypeScript support, needed wrappers | full inference, no augmentation needed for basic use |
| `mapState` / `mapGetters` boilerplate | `useStore()` and `storeToRefs` |
| dynamic `registerModule` | stores are registered automatically on first use (code-splitting for free) |
| plugins subscribe to mutations | plugins use `$subscribe` and `$onAction` |

## Side-by-side

```ts
// Vuex
mutations: { increment(state) { state.count++ } },
actions: { incrementLater({ commit }) { setTimeout(() => commit('increment'), 500) } },
// component
store.dispatch('incrementLater');

// Pinia
export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() { this.count++; },
    incrementLater() { setTimeout(() => this.increment(), 500); },
  },
});
// component
useCounterStore().incrementLater();
```

## Migrating

Pinia and Vuex can run side by side, so migration can be done one module at a time:

1. Install Pinia and `app.use(createPinia())` next to the Vuex store.
2. Turn one Vuex module into a store with `defineStore('<module name>', ...)`: state stays, getters stay (use `this` instead of `rootGetters` and call other stores directly), and **mutations and actions merge into actions**.
3. Replace `commit` / `dispatch` / `mapX('module', ...)` call sites with direct store calls.
4. Remove the module from Vuex; repeat until the Vuex store is empty.

Pinia versions: Pinia 2 supported Vue 2 and 3; Pinia 3 (2025) dropped Vue 2 and removed deprecated APIs; Pinia 4 is ESM-only and needs `@vue/devtools-api` v8 installed alongside it.
