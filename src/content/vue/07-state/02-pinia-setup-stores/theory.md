## Two ways to define a store

`defineStore` accepts either an **options object** (previous lesson) or a **setup function**. The setup syntax is the Composition API applied to stores:

```ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0);                         // state
  const double = computed(() => count.value * 2); // getter
  function increment() {                         // action
    count.value++;
  }
  return { count, double, increment };
});
```

Pinia inspects what you **return**:

| Returned value | Becomes |
| --- | --- |
| `ref()` / `reactive()` | state (shows in devtools, serialized for SSR, patched by `$patch`) |
| `computed()` | getter |
| function | action (tracked by `$onAction`) |

Anything you do not return is **private**. Pinia warns in development when a store keeps state it does not expose, because private state breaks SSR, devtools and plugins.

## Same store, both syntaxes

```ts
// Option store
defineStore('todos', {
  state: () => ({ todos: [] as Todo[] }),
  getters: { remaining: (state) => state.todos.filter((t) => !t.completed).length },
  actions: {
    toggle(id: number) {
      const todo = this.todos.find((t) => t.id === id);
      if (todo) todo.completed = !todo.completed;
    },
  },
});

// Setup store
defineStore('todos', () => {
  const todos = ref<Todo[]>([]);
  const remaining = computed(() => todos.value.filter((t) => !t.completed).length);
  function toggle(id: number) {
    const todo = todos.value.find((t) => t.id === id);
    if (todo) todo.completed = !todo.completed;
  }
  return { todos, remaining, toggle };
});
```

The option store uses `this`; the setup store uses closures and `.value`.

## What setup stores add

- **Any composable works inside**: `watch`, `useRoute()`, `useLocalStorage()` from VueUse, `inject()` for app-level provides.
- **Watchers inside the store** (for example syncing to `localStorage`).
- **Better type inference**, since everything is plain TypeScript.
- **Private helpers**: non-reactive functions you do not return.

## What they lack

- **No built-in `$reset()`**. Option stores can rebuild their state by calling `state()` again; a setup function has no such factory. Write your own:

```ts
function $reset() {
  todos.value = [];
  error.value = null;
}
return { todos, error, $reset };
```

- You must remember to **return every piece of state**.

## Async actions

Actions can be `async` and are where side effects belong:

```ts
async function fetchTodos() {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch('/api/todos');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    todos.value = await response.json();
  } catch {
    error.value = 'Failed to load todos';
  } finally {
    loading.value = false;
  }
}
```

`fetch` only rejects on network errors; a 500 response still resolves, so check `response.ok`.

For server data that needs caching, deduplication and refetching, a dedicated tool like TanStack Query or Pinia Colada is usually a better fit than hand-written loading flags (see the data fetching lessons).

## Which should you choose?

Both are first-class and can be mixed in one app. Option stores are approachable and structured, closest to Vuex. Setup stores are more flexible and are the natural choice if your components already use `<script setup>` and composables.

## Pitfalls

- Forgetting to return a ref: the component sees `undefined`, and devtools does not show it.
- Calling `useOtherStore()` at module top level (outside the setup function) runs before Pinia is installed. Call it inside the setup function or inside actions.
- Destructuring the store in a component (`const { todos } = useTodosStore()`) breaks reactivity for state and getters. The next lesson covers `storeToRefs`.
