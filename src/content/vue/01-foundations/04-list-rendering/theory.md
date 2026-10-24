## Rendering lists with `v-for`

`v-for` repeats an element once per item of a source. The syntax mirrors `for...of`, with an optional index:

```vue
<script setup lang="ts">
import { ref } from 'vue';

const todos = ref([
  { id: 1, text: 'Learn Vue' },
  { id: 2, text: 'Build an app' },
]);
</script>

<template>
  <ul>
    <li v-for="(todo, index) in todos" :key="todo.id">
      {{ index + 1 }}. {{ todo.text }}
    </li>
  </ul>
</template>
```

The loop variable is scoped to the element: you can use it in attributes, events and children. Destructuring works too: `v-for="{ id, text } in todos"`.

## Other sources

| Source | Syntax | Variables |
| --- | --- | --- |
| Array | `v-for="(item, index) in items"` | item, index |
| Object | `v-for="(value, key, index) in user"` | value, key, index |
| Range | `v-for="n in 5"` | 1 to 5 (starts at **1**) |
| Map / Set / any iterable | `v-for="entry in map"` | iteration value |

`of` is accepted as an alias of `in`.

To repeat a group of elements without a wrapper, use `<template v-for>` (the `:key` goes on the `<template>`):

```vue
<template v-for="item in items" :key="item.id">
  <dt>{{ item.term }}</dt>
  <dd>{{ item.definition }}</dd>
</template>
```

## Why `:key` matters

When the list changes, Vue must decide which existing DOM node corresponds to which item. Without a key (or with the index as key) Vue uses an **in-place patch** strategy: it keeps the nodes in position and only updates their content.

Removing the first of three items with index keys means: node 0 now shows item 2, node 1 shows item 3, node 2 is removed. Text looks correct, but anything **stateful** inside the nodes (an `<input>`'s typed value, focus, a child component's state, a running transition) stays attached to the wrong item.

With a stable, unique key (`todo.id`) Vue moves and removes the **exact** nodes that belong to each item:

```vue
<!-- ❌ index changes when items move -->
<li v-for="(todo, index) in todos" :key="index">...</li>

<!-- ✅ identity of the item -->
<li v-for="todo in todos" :key="todo.id">...</li>
```

Keys must be primitives (string or number) and unique among siblings. Always add them; the official style guide and ESLint plugin require it.

## Changing arrays

Vue's reactive arrays track mutation methods (`push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`) and index assignment. Non-mutating methods (`filter`, `map`, `concat`, `slice`) return a new array, so assign the result:

```ts
todos.value.push({ id: 3, text: 'Ship it' });
todos.value = todos.value.filter((todo) => todo.id !== 1);
```

> **Vue 2 legacy:** reactivity was based on `Object.defineProperty`, so `items[0] = x` and `items.length = 0` were not detected and you needed `Vue.set`. Vue 3 proxies remove this limitation.

## Filtering and sorting

Do not mutate the source inside the template (`items.sort()` mutates and triggers another render). Derive a new list with a computed property (covered in the Reactivity module) and loop over it:

```vue
<li v-for="todo in openTodos" :key="todo.id">{{ todo.text }}</li>
```

## `v-for` with `v-if`

Never put both on the same element: in Vue 3 `v-if` is evaluated first and cannot see the loop variable. Filter with a computed, or put `v-if` on an inner element or wrapper `<template>`.
