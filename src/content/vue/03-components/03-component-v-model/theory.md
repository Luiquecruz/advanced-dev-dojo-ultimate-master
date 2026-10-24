## `v-model` on components

On a native input, `v-model` syncs a value both ways. On a component it does the same thing, by convention:

```vue
<RatingInput v-model="rating" />
<!-- is shorthand for -->
<RatingInput :modelValue="rating" @update:modelValue="(value) => (rating = value)" />
```

So a component supports `v-model` when it accepts a `modelValue` prop and emits `update:modelValue`.

## The legacy way: prop + emit

Before Vue 3.4 every two-way component repeated the same boilerplate:

```vue
<script setup lang="ts">
const props = defineProps<{ modelValue: number }>();
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();
</script>

<template>
  <input :value="props.modelValue" @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))" />
</template>
```

## The modern way: `defineModel` (Vue 3.4+)

`defineModel()` declares the prop **and** the event and returns a ref you can read and write:

```vue
<script setup lang="ts">
const model = defineModel<number>({ default: 0 });
</script>

<template>
  <button @click="model++">{{ model }}</button>
</template>
```

Writing `model.value = 5` emits `update:modelValue` with `5`. If the parent does not bind `v-model`, the ref works as local state, so the component is usable uncontrolled too.

## Named and multiple models

Pass a name to create additional models. The parent binds them with `v-model:name`:

```ts
const title = defineModel<string>('title', { required: true });
const published = defineModel<boolean>('published', { default: false });
```

```vue
<PostEditor v-model:title="post.title" v-model:published="post.isPublished" />
```

This replaces Vue 2's `.sync` modifier and the `model` component option.

## Modifiers

Custom modifiers are available through the tuple form:

```ts
const [model, modifiers] = defineModel<string, 'trim'>({
  set(value) {
    return modifiers.trim ? value.trim() : value;
  },
});
```

`<TextField v-model.trim="name" />` now trims before emitting.

## Pitfalls

- **Mutating a model object in place** (`model.value.title = 'x'`) changes the parent's object without emitting. Assign a new object (`model.value = { ...model.value, title: 'x' }`) so the update is explicit.
- `defineModel` with a `default` but no parent `v-model` can make parent and child disagree. Give the parent's ref a value instead of relying on the child's default.
- `defineModel` is a macro: top level of `<script setup>` only.

## Options API comparison

```js
export default {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  computed: {
    value: {
      get() { return this.modelValue; },
      set(value) { this.$emit('update:modelValue', value); },
    },
  },
};
```

The writable computed is exactly what `defineModel` generates for you.
