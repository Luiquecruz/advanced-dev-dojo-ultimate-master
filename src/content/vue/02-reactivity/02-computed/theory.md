## Derived state with `computed()`

Templates should stay declarative. When an expression grows (filtering, sorting, totals), move it to a **computed property**:

```ts
import { computed, ref } from 'vue';

const todos = ref([
  { id: 1, text: 'Learn Vue', done: true },
  { id: 2, text: 'Write tests', done: false },
]);

const openTodos = computed(() => todos.value.filter((todo) => !todo.done));
const progress = computed(() => `${todos.value.length - openTodos.value.length}/${todos.value.length}`);
```

`computed()` returns a **read-only ref**: read it with `.value` in script, directly in templates (`{{ progress }}`).

## Caching: computed vs methods

A function in the template (`{{ getOpenTodos().length }}`) runs on **every render** of the component. A computed property runs its getter only when one of its **reactive dependencies changed** since the last evaluation; otherwise it returns the cached value.

```ts
const now = computed(() => Date.now()); // ❌ never updates: Date.now() is not reactive
```

Dependencies are discovered automatically while the getter runs: every ref or reactive property it reads becomes a dependency. Computed values are also **lazy**: if nothing reads them, the getter never runs. Since Vue 3.4, a computed that recomputes to the **same** value does not trigger its own dependents.

## Writable computed

Pass an object with `get` and `set` to create a two-way derived value, perfect for `v-model`:

```ts
const firstName = ref('Ada');
const lastName = ref('Lovelace');

const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set: (value: string) => {
    const [first, ...rest] = value.split(' ');
    firstName.value = first;
    lastName.value = rest.join(' ');
  },
});

fullName.value = 'Grace Hopper'; // runs the setter
```

The setter should update the **source** state; the getter then derives the new value.

When a writable computed **normalizes** the value (here, a trailing space disappears because `lastName` is empty), binding it with plain `v-model` fights the user while typing: every keystroke runs the setter and the getter rewrites the field. `v-model.lazy` syncs on `change` (blur or Enter) and avoids that.

## Previous value (Vue 3.4+)

The getter receives the previous value as its first argument, useful to keep a value until a condition is met:

```ts
const lastEven = computed((previous) => (count.value % 2 === 0 ? count.value : previous));
```

## Rules for getters

- **No side effects.** Do not mutate state, fetch data or touch the DOM inside a getter. Use a watcher for side effects.
- **Do not mutate the computed result.** `openTodos.value.push(x)` changes a temporary snapshot that will be thrown away on the next recomputation. Update the source instead.
- **Keep them pure and cheap.** They can depend on other computed values, forming a graph that Vue updates efficiently.

## Debugging

`computed(getter, { onTrack, onTrigger })` calls the hooks (development only) when a dependency is tracked or triggers a recomputation. Put a `debugger` statement inside to inspect why something re-runs.

## Options API

```js
export default {
  data: () => ({ todos: [] }),
  computed: {
    openTodos() { return this.todos.filter((todo) => !todo.done); },
    fullName: {
      get() { return `${this.first} ${this.last}`; },
      set(value) { [this.first, this.last] = value.split(' '); },
    },
  },
};
```

Same caching semantics, accessed as `this.openTodos`.
