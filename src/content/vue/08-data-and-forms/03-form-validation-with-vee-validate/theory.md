## Why a form library?

`v-model` gives you values, but real forms also need: per-field errors, validation on input and on submit, "touched" and "dirty" flags, submit-in-progress state, and resetting. **VeeValidate** is the most used form library for Vue. Version 4 is built on the Composition API and works with plain functions, global rules or schema libraries.

## The pieces

```ts
import { useForm } from 'vee-validate';

const { defineField, errors, handleSubmit, meta, isSubmitting, resetForm } = useForm({
  initialValues: { email: '', password: '' },
  validationSchema: {
    email: (value: string) => !!value || 'Email is required',
    password: (value: string) => value.length >= 8 || 'Password must be at least 8 characters',
  },
});

const [email, emailAttrs] = defineField('email');
const [password, passwordAttrs] = defineField('password');

const onSubmit = handleSubmit(async (values) => {
  await api.signUp(values);
  resetForm();
});
```

```vue
<form novalidate @submit="onSubmit">
  <input v-model="email" v-bind="emailAttrs" type="email" />
  <p v-if="errors.email">{{ errors.email }}</p>
  <button :disabled="isSubmitting">Sign up</button>
</form>
```

- **Rules are functions** returning `true` (valid) or a message string. They may be `async` (e.g. "is this username taken?").
- `validationSchema` maps field paths to rules. Nested paths like `'address.city'` work too.
- `defineField(path)` returns `[valueRef, attrs]`. Bind the ref with `v-model` and spread `attrs` with `v-bind`; the attrs carry `onBlur`/`onInput` handlers that drive validation timing and the touched flag.
- `errors` is a computed object of the first error per field.
- `handleSubmit(fn)` returns an event handler that prevents the default submit, validates every field, marks them touched and only calls `fn` with typed values when valid. Pass a second callback to handle invalid submissions.
- `meta.value.valid`, `meta.value.dirty` and `meta.value.touched` describe the whole form.

## Field-level API: `useField`

For reusable input components, each field can own its validation:

```ts
// TextInput.vue
const props = defineProps<{ name: string; label: string }>();
const { value, errorMessage, handleBlur } = useField<string>(() => props.name, (v) => !!v || 'Required');
```

Fields created with `useField` inside a component that called `useForm` (higher in the tree) automatically register with that form. `useField` is the right tool when the input is its own component; `defineField` is shorter when the whole form lives in one component.

## Components API

VeeValidate also ships `<Form>`, `<Field>` and `<ErrorMessage>` components that wrap the same logic with slots. They are convenient in templates-only code, but the composition functions are easier to type and test.

## Global rules (legacy style)

VeeValidate 2 and 3 (Vue 2) were built around global string rules like `rules="required|email"`. Version 4 still supports `defineRule('required', fn)` plus string rules, and the `@vee-validate/rules` package provides the classic set. Modern code prefers plain functions or a schema (next lesson) because they are type-safe and tree-shakeable.

## Validation timing

By default a field validates when its value changes and on blur, and every field validates on submit. You can tune this per field (`validateOnModelUpdate`, `validateOnBlur`) or globally with `configure({ ... })`. A common UX choice is to show errors only for touched fields: `v-if="errors.email && emailMeta.touched"`.

## Pitfalls

- Forgetting `novalidate` on the `<form>`: the browser's built-in validation tooltips run before VeeValidate and block the submit.
- Returning `false` from a rule gives a generic message; return a string to control the text.
- Reading `values` inside the submit handler from `defineField` refs instead of the `values` argument loses VeeValidate's typed, validated output.
- Creating rules inline in the template recreates them on every render; define them in `<script setup>`.
