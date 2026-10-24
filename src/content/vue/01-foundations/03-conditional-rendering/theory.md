## `v-if`, `v-else-if`, `v-else`

`v-if` renders an element only when its expression is truthy. When it becomes falsy, the element (and everything inside it, including child components) is **destroyed**. When it becomes truthy again, it is created from scratch.

```vue
<script setup lang="ts">
import { ref } from 'vue';

const status = ref<'idle' | 'loading' | 'error'>('idle');
</script>

<template>
  <p v-if="status === 'loading'">Loading...</p>
  <p v-else-if="status === 'error'" role="alert">Something went wrong</p>
  <p v-else>Ready</p>
</template>
```

Rules for the chain:

- `v-else-if` and `v-else` must come **immediately after** a `v-if` or `v-else-if` sibling. Anything in between (even a text node with content) breaks the chain and the compiler throws.
- Only one branch of the chain is rendered at any time.

## Grouping with `<template>`

To toggle several elements without adding a wrapper element, put the directive on an invisible `<template>`:

```vue
<template v-if="user">
  <h2>{{ user.name }}</h2>
  <p>{{ user.email }}</p>
</template>
```

The `<template>` tag itself is not rendered.

## `v-show`

`v-show` always renders the element and only toggles its inline `display: none` style:

```vue
<aside v-show="showHelp">Press ? to open the shortcuts.</aside>
```

| | `v-if` | `v-show` |
| --- | --- | --- |
| DOM when false | element removed | element kept, `display: none` |
| Toggle cost | high (create / destroy) | low (one style change) |
| Initial cost when false | none (lazy) | element is rendered anyway |
| Works on `<template>` | yes | no |
| Supports `v-else` | yes | no |

Rule of thumb: use `v-show` for things that toggle **often** (tabs, tooltips, panels), `v-if` for things that rarely change or are expensive to render.

## State is lost with `v-if`

Because `v-if` destroys its content, any local state inside it is lost: text typed in an `<input>`, a child component's refs, scroll position. If that matters, use `v-show` or keep the state in the parent.

The opposite trick is also useful: Vue reuses elements across branches when it can. If two branches render the same kind of element (two `<input>`s), give them different `key`s to force a fresh element:

```vue
<input v-if="loginType === 'email'" key="email" placeholder="Email" />
<input v-else key="phone" placeholder="Phone" />
```

## `v-if` together with `v-for`

Do not put `v-if` and `v-for` on the same element. In **Vue 3, `v-if` has higher priority**, so it cannot see the loop variable:

```vue
<!-- ❌ todo is not defined yet when v-if runs -->
<li v-for="todo in todos" v-if="!todo.done">{{ todo.text }}</li>

<!-- ✅ wrap, or better, filter with a computed -->
<template v-for="todo in todos" :key="todo.id">
  <li v-if="!todo.done">{{ todo.text }}</li>
</template>
```

This is a **breaking change from Vue 2**, where `v-for` had the higher priority.

## Truthiness pitfalls

The expression follows JavaScript truthiness: `0`, `''`, `null`, `undefined` and `NaN` are falsy, while `[]` and `{}` are truthy. `v-if="items"` is always true for an array; write `v-if="items.length"` (or `items.length > 0`) instead.
