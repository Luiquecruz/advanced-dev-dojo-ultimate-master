## Listening to events with `v-on`

`v-on:event` (shorthand `@event`) attaches a listener to a DOM event. The value can be an **inline statement** or a **method reference**:

```vue
<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);

function greet(event: MouseEvent) {
  console.log('clicked', (event.currentTarget as HTMLButtonElement).textContent);
}
</script>

<template>
  <button @click="count++">Add</button>        <!-- inline statement -->
  <button @click="greet">Greet</button>         <!-- method reference: receives the event -->
  <button @click="say('hi', $event)">Say</button> <!-- call with arguments + the event -->
</template>
```

- A **method reference** (`greet`, `user.save`) is called with the native event.
- An **inline call** (`say('hi')`) does not receive the event automatically; pass the special `$event` variable when you need it, or use an arrow function: `@click="(event) => say('hi', event)"`.

## Event modifiers

Instead of calling `event.preventDefault()` or `event.stopPropagation()` inside handlers, Vue offers modifiers so methods stay focused on logic:

| Modifier | Effect |
| --- | --- |
| `.prevent` | `event.preventDefault()` (e.g. a form submit that should not reload) |
| `.stop` | `event.stopPropagation()` (parent listeners do not fire) |
| `.self` | only fire when `event.target` is the element itself, not a child |
| `.once` | fire at most once, then remove the listener |
| `.capture` | listen in the capture phase |
| `.passive` | `{ passive: true }`, improves scroll performance; never combine with `.prevent` |

Modifiers chain, and **order matters**: `@click.prevent.self` prevents every click (including children), `@click.self.prevent` only prevents clicks on the element itself.

```vue
<form @submit.prevent="save">...</form>
<div class="overlay" @click.self="close">
  <dialog open>Clicks in here do not close the overlay</dialog>
</div>
```

## Key and mouse modifiers

Keyboard events accept any [`KeyboardEvent.key`](https://developer.mozilla.org/docs/Web/API/KeyboardEvent/key) in kebab-case, plus common aliases:

```vue
<input @keyup.enter="submit" />
<input @keydown.esc="cancel" />
<input @keyup.page-down="nextPage" />
<textarea @keydown.ctrl.enter="send" />
<button @click.exact="select" @click.shift.exact="selectRange">Pick</button>
```

- Aliases: `.enter`, `.tab`, `.delete` (Delete and Backspace), `.esc`, `.space`, `.up`, `.down`, `.left`, `.right`.
- System modifiers: `.ctrl`, `.alt`, `.shift`, `.meta`. Combine with `.exact` to require exactly those keys.
- Mouse buttons: `.left`, `.right`, `.middle`.

## Reading input values

Before learning `v-model` (next lesson), you can read values from the event target:

```ts
function onEnter(event: KeyboardEvent) {
  const input = event.target as HTMLInputElement;
  tags.value.push(input.value);
  input.value = '';
}
```

## Pitfalls

- `@click="save()"` and `@click="save"` both work, but only the second passes the event automatically.
- `@click="handler()"` with a method that **returns a function** does not register that function. The expression is the handler body.
- Do not use `.passive` and `.prevent` together: the browser ignores `preventDefault()` in passive listeners.
- Listeners declared in the template are removed automatically when the component unmounts. Listeners you add manually with `addEventListener` (on `window`, for example) must be removed in `onUnmounted`.

## Options API note

Handlers live in `methods`, and `this` points to the component instance:

```js
export default {
  data: () => ({ count: 0 }),
  methods: {
    increment() { this.count++; },
  },
};
```
