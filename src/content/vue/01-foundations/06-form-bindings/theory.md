## Two-way binding with `v-model`

Keeping a form field and a ref in sync by hand takes two bindings:

```vue
<input :value="text" @input="text = ($event.target as HTMLInputElement).value" />
```

`v-model` is the shorthand for exactly that pattern:

```vue
<script setup lang="ts">
import { ref } from 'vue';
const text = ref('');
</script>

<template>
  <input v-model="text" />
  <p>You typed: {{ text }}</p>
</template>
```

`v-model` **ignores** the initial `value`, `checked` and `selected` attributes in the HTML. The ref is the single source of truth, so declare initial values in `<script>`.

## What `v-model` expands to per element

| Element | Property | Event |
| --- | --- | --- |
| `<input type="text">`, `<textarea>` | `value` | `input` |
| `<input type="checkbox">`, `<input type="radio">` | `checked` | `change` |
| `<select>` | `value` | `change` |

### Checkboxes

A single checkbox bound to a boolean toggles it. Use `true-value` / `false-value` for other values:

```vue
<input type="checkbox" v-model="newsletter" />
<input type="checkbox" v-model="answer" true-value="yes" false-value="no" />
```

Several checkboxes bound to the **same array** collect the `value` of every checked box:

```vue
<script setup lang="ts">
const topics = ref<string[]>([]);
</script>

<template>
  <label><input type="checkbox" value="vue" v-model="topics" /> Vue</label>
  <label><input type="checkbox" value="ts" v-model="topics" /> TypeScript</label>
</template>
```

### Radios and selects

Radios in a group share one `v-model`; the ref holds the `value` of the checked one:

```vue
<label><input type="radio" value="free" v-model="plan" /> Free</label>
<label><input type="radio" value="pro" v-model="plan" /> Pro</label>

<select v-model="country">
  <option disabled value="">Choose one</option>
  <option value="br">Brazil</option>
  <option value="pt">Portugal</option>
</select>
```

`<select multiple>` binds to an array. Bind non-string values with `:value` (`<option :value="{ id: 1 }">`); `v-model` will hold the actual object.

## Modifiers

```vue
<input v-model.trim="name" />   <!-- strips whitespace -->
<input v-model.number="age" />  <!-- parseFloat; keeps the string if it is not a number -->
<input v-model.lazy="email" />  <!-- syncs on "change" (blur / Enter) instead of every keystroke -->
```

Without `.number`, `<input type="number">` still gives you a **string**. This is a classic source of bugs such as `'2' + 1 === '21'`.

## Pitfalls

- **Forgetting `value` on checkboxes in an array group.** Without it every box contributes the browser default `"on"`, so the array cannot tell them apart. Always set a `value`.
- **Binding `v-model` to a prop.** Props are read-only. Use a local copy or `defineModel` (covered in the Components module).
- **IME languages** (Chinese, Japanese, Korean): `v-model` waits until composition ends. Listen to `@input` yourself if you need every intermediate keystroke.
- **Accessibility:** wrap fields in `<label>` or use `for`/`id` pairs so assistive technologies (and Testing Library's `getByLabelText`) can find them.

## Options API and Vue 2 notes

In both APIs the template is the same; the model lives in `data()` in the Options API. On **custom components**, Vue 2 used the `value` prop and `input` event plus the `.sync` modifier; Vue 3 uses `modelValue` / `update:modelValue` and supports multiple `v-model:name` bindings. You will see that in the Components module.
