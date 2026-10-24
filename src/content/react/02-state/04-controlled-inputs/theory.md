## Uncontrolled vs controlled

A form field can hold its value in two places:

- **Uncontrolled**: the DOM keeps the value. You read it when you need it (with `FormData` on submit or a ref). Set a starting value with `defaultValue` / `defaultChecked`.
- **Controlled**: React state is the single source of truth. You pass the value down with `value` (or `checked`) and update the state in `onChange`.

```jsx
function NameField() {
  const [name, setName] = useState('');
  return (
    <>
      <input value={name} onChange={(event) => setName(event.target.value)} />
      <p>Hello, {name || 'stranger'}!</p>
    </>
  );
}
```

On every keystroke: the browser fires `input` → React calls `onChange` → you set state → React re-renders with the new `value`. Because React owns the value, you can **react to it while the user types**: live previews, validation, character counters, disabling buttons, or transforming input.

## Transforming input

Whatever you put in state is what the field shows, so you can normalize input as it is typed:

```jsx
<input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/\s+/g, '-'))} />
```

## Every field type

| Element | Value prop | Read in onChange |
| --- | --- | --- |
| `<input type="text">`, `email`, `password`, `<textarea>` | `value` | `event.target.value` |
| `<input type="checkbox">` | `checked` | `event.target.checked` |
| `<input type="radio">` | `checked={plan === 'pro'}` | `event.target.value` |
| `<select>` | `value` on the `<select>` | `event.target.value` |
| `<input type="number">` | `value` | `event.target.value` (**a string**; convert with `Number`) |

Notes:

- In HTML, `<textarea>` content goes between the tags and `<option selected>` marks the choice. In React, both use **`value`**.
- `<select multiple>` takes an array as `value`.
- `<input type="file">` is always uncontrolled: its value is read-only.

## One handler for many fields

```jsx
const [form, setForm] = useState({ email: '', password: '' });

function handleChange(event) {
  const { name, value } = event.target;
  setForm({ ...form, [name]: value });
}

<input name="email" value={form.email} onChange={handleChange} />
<input name="password" type="password" value={form.password} onChange={handleChange} />
```

## Submitting

```jsx
function handleSubmit(event) {
  event.preventDefault();
  onSubmit({ name, plan });
}
```

Derive the "can submit" flag during render instead of storing it in another state variable:

```jsx
const canSubmit = name.trim() !== '' && acceptedTerms;
<button disabled={!canSubmit}>Sign up</button>
```

## Pitfalls

- **`value` without `onChange`** makes a read-only field: typing does nothing and React warns. Add `onChange`, use `readOnly`, or switch to `defaultValue`.
- **Switching from uncontrolled to controlled**: `useState()` starts as `undefined`, so the field begins uncontrolled. When it later receives a string React warns. Always initialize with `''` (or `false` for checkboxes), and never pass `null` as `value`.
- Reading `event.target.value` for a checkbox returns `"on"`, not a boolean. Use `checked`.
- Number inputs give strings: `'2' + 1 === '21'`.

## Controlled or uncontrolled?

Controlled inputs are best when the UI must respond to every change. For simple forms that only need the values on submit, uncontrolled fields with `FormData` (or React 19 form Actions) mean less code and fewer re-renders. Libraries such as React Hook Form are built around uncontrolled fields for that reason.

## Legacy note

Class components wrote the same pattern with `this.state` and `this.setState({ [event.target.name]: event.target.value })`, plus `.bind(this)` on handlers. The controlled-input idea itself has not changed since React's first versions.
