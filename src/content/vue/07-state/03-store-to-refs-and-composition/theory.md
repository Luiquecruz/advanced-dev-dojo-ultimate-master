## The destructuring trap

A store is a `reactive()` object. Destructuring a reactive object reads each property **once** and copies the value, so the copies never update:

```ts
const cart = useCartStore();
const { total } = cart;      // ❌ a plain number, frozen at its current value
cart.add(1);
console.log(total);          // still the old value
```

The template keeps showing stale data, and there is no warning. Three correct alternatives:

```ts
// 1. Use the store directly
const cart = useCartStore();
// template: {{ cart.total }}

// 2. storeToRefs for state and getters
const { items, total } = storeToRefs(cart); // Ref<Product[]>, ComputedRef<number>
const { add } = cart;                       // actions are plain functions: safe to destructure

// 3. A single computed
const total = computed(() => cart.total);
```

## storeToRefs vs toRefs

`storeToRefs` is the store-aware version of Vue's `toRefs`. It creates refs **only** for state and getters and skips actions and Pinia's internal properties (`$patch`, `$id`, ...). `toRefs(store)` would also wrap every action and internal, which is wasteful and confusing.

The refs are two-way: writing `items.value` or `total` for a writable state ref updates the store.

## Composing stores

Stores can use other stores. Call the other `useXxxStore()` **inside** the setup function (or inside getters/actions of an option store), never at module top level:

```ts
export const useCartStore = defineStore('cart', () => {
  const products = useProductsStore();       // ✅ inside setup
  const ids = ref<number[]>([]);
  const total = computed(() =>
    ids.value.reduce((sum, id) => sum + (products.byId(id)?.price ?? 0), 0),
  );
  return { ids, total };
});

// ❌ module top level: runs before app.use(pinia) (or with the wrong pinia in SSR)
const products = useProductsStore();
```

Because the computed reads `products.byId(...)`, it tracks the products store too: change a price there and the cart total recomputes.

Option store equivalent:

```ts
getters: {
  total(state) {
    const products = useProductsStore();
    return state.ids.reduce((sum, id) => sum + (products.byId(id)?.price ?? 0), 0);
  },
},
```

### Getters with arguments

A getter can return a function to accept parameters (`byId(id)`). The returned function itself is **not cached**; only the outer getter is. For hot paths, build a lookup map in a getter (`computed(() => new Map(...))`) and read from it.

### Avoid circular reads

Store A may use store B and vice versa, but they must not both read each other **during setup** (for example in a top-level `watch` with `immediate: true`). Reading each other inside getters or actions is fine.

## Legacy vs modern

Vuex provided `mapState`, `mapGetters` and `mapActions` helpers to spread store members into `computed` and `methods`, and modules were namespaced strings (`'cart/addItem'`). Pinia keeps `mapState`, `mapActions`, `mapWritableState` and `mapStores` for the Options API, but in `<script setup>` you use the store directly or `storeToRefs`. Instead of modules, each store is its own `defineStore` file, and composition is just a function call.

## Pitfalls

- Destructuring state or getters without `storeToRefs`.
- Using `storeToRefs` on a store and expecting actions in the result (they are skipped).
- Calling `useXxxStore()` outside a component, store or action before Pinia is active (e.g. in a module that is imported by `main.ts` before `app.use(pinia)`). In router guards, call it inside the guard function.
