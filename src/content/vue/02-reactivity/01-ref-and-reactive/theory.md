## Two ways to declare reactive state

Vue tracks reads and writes of reactive state, re-rendering components and re-running computed values and watchers that depend on it. The Composition API gives you two primitives.

### `ref()`

`ref()` wraps **any value** (primitive, object, array) in an object with a `.value` property:

```ts
import { ref } from 'vue';

const count = ref(0);
count.value++;              // tracked write

const user = ref({ name: 'Ada', tags: ['math'] });
user.value.tags.push('code'); // deep: nested objects are reactive too
user.value = { name: 'Grace', tags: [] }; // replacing the whole value is fine
```

In the template, top-level refs are **unwrapped** automatically, so you write `{{ count }}`, not `{{ count.value }}`.

### `reactive()`

`reactive()` makes an **object** itself reactive by returning a Proxy around it:

```ts
import { reactive } from 'vue';

const cart = reactive({ items: [] as string[], coupon: '' });
cart.items.push('Book'); // no .value
cart.coupon = 'SAVE10';
```

## Limitations of `reactive()`

1. **Objects only.** `reactive(0)` does not work (it returns the value with a warning).
2. **You cannot replace the object.** Reactivity is bound to the proxy, so reassigning the variable disconnects everything that was tracking it:

   ```ts
   let state = reactive({ count: 0 });
   state = reactive({ count: 1 }); // ❌ the template still holds the old proxy
   Object.assign(state, { count: 1 }); // ✅ mutate in place
   ```

3. **Destructuring loses reactivity.** `const { count } = state` copies the current number; later changes are not seen. Passing `state.count` to a function has the same problem. (`toRefs`, covered later in this module, fixes it.)
4. **Identity:** `reactive(raw) !== raw`. Always work with the proxy.

Because of these limits, the Vue docs recommend **`ref()` as the primary API**. `reactive()` is still handy for a group of fields that always travel together, like form state.

## Ref unwrapping rules

- **Template:** top-level refs are unwrapped (`{{ count }}`). A ref nested in a plain object is not unwrapped inside expressions: with `const obj = { count: ref(0) }`, `{{ obj.count + 1 }}` renders `[object Object]1`. Destructure it into a top-level binding (`const { count } = obj`) instead.
- **Inside `reactive()` objects:** refs are unwrapped when accessed as properties: `reactive({ count: ref(0) }).count` is `0`.
- **Inside reactive arrays and collections** (`Map`, `Set`): refs are **not** unwrapped; use `.value`.

## Deep by default

Both `ref()` and `reactive()` make nested objects deeply reactive (lazily, the first time you access them). For large immutable data this costs memory and time; `shallowRef` and `markRaw` (later lesson) opt out.

## Updates are batched

Changing state does not update the DOM synchronously. Vue queues the work and flushes it in the next microtask, so ten writes in a row cause **one** render. To read the updated DOM, `await nextTick()`.

## Options API and Vue 2

With the Options API, everything returned from `data()` is made reactive with `reactive()` internally and exposed on `this`:

```js
export default {
  data: () => ({ count: 0, user: { name: 'Ada' } }),
  methods: { increment() { this.count++; } },
};
```

Vue 2 used `Object.defineProperty` getters/setters instead of Proxies, so adding new properties or setting array indexes was not detected (`Vue.set(obj, key, value)` was required). Vue 3 Proxies detect both.
