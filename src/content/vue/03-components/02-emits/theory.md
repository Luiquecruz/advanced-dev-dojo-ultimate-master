## Events flow up

Props carry data **down**; events carry intent **up**. A child announces that something happened and the parent decides what to do with it.

```vue
<!-- Child: LikeButton.vue -->
<script setup lang="ts">
const emit = defineEmits<{ like: [postId: number] }>();
</script>

<template>
  <button @click="emit('like', 42)">Like</button>
</template>
```

```vue
<!-- Parent -->
<LikeButton @like="(id) => likes.add(id)" />
```

## Declaring events with `defineEmits`

Like `defineProps`, `defineEmits` is a compiler macro. The TypeScript form uses **named tuple** syntax (Vue 3.3+): each key is an event, each tuple is its argument list.

```ts
const emit = defineEmits<{
  changeQuantity: [delta: number];
  remove: [];
}>();

emit('changeQuantity', 1);   // typed: delta must be a number
emit('remove');
```

The runtime form works in JavaScript and can validate payloads:

```ts
const emit = defineEmits({
  remove: null,                                   // no validation
  changeQuantity: (delta: number) => delta !== 0, // returns false -> console warning
});
```

In templates you can also emit with `$emit('remove')`, but in `<script setup>` you must use the function returned by `defineEmits`.

## Naming: camelCase in, kebab-case out

Emit in camelCase (`emit('changeQuantity')`) and listen with kebab-case in templates (`@change-quantity`). Vue normalizes both, the same way it does with props.

## Why declare events at all?

- **Documentation and types**: the parent gets autocompletion and type checks on payloads.
- **Fallthrough**: declared events are removed from `$attrs`. An undeclared `@click` listener on a component falls through to its root element as a native listener, which can fire twice if you also emit `click`.
- **Listeners are props under the hood**: `@remove="fn"` compiles to the prop `onRemove: fn`. That is why tests can pass `{ onRemove: fn }` when mounting.

## Pitfalls

- Events **do not bubble**. A grandparent cannot listen to a grandchild's event; re-emit it or use provide/inject or a store.
- Do not emit to change a prop and also mutate it locally. Let the parent own the state.
- Keep payloads serializable and meaningful (`delta`, `id`), not the whole child component.

## Options API comparison

```js
export default {
  emits: ['remove', 'changeQuantity'],
  methods: {
    increase() { this.$emit('changeQuantity', 1); },
  },
};
```

In Vue 2 the `emits` option did not exist; every listener on a component was considered a component event. In Vue 3, declaring `emits` is what tells Vue a listener is a component event rather than a native one.
