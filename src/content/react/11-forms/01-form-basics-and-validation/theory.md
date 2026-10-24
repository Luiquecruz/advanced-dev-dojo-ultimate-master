## A form is state plus rules

A form has **values**, **validation rules**, **errors** derived from them, and a **submit** step. In plain React, you keep values in state (controlled inputs) and validate with a pure function.

## One state object, one change handler

Instead of a `useState` per field, store all values together and use each input's `name`:

```jsx
const [values, setValues] = useState({ name: '', email: '' });

function handleChange(event) {
  const { name, value } = event.target;
  setValues((current) => ({ ...current, [name]: value }));
}

<input name="email" value={values.email} onChange={handleChange} />;
```

## Validation is a pure function

Keep the rules outside the component: easy to test, easy to reuse on the server.

```js
export function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Name is required';
  if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = 'Enter a valid email';
  return errors;
}
```

An empty object means "valid". Because errors can always be **computed from the values**, you do not need to store them in state; store only *when* to show them.

## When to show errors

Showing "Email is invalid" while the user types the first letter is hostile. Common strategies:

| Strategy | Shows errors | Feels |
| --- | --- | --- |
| On submit | after the first submit attempt | calm, but late |
| On blur ("touched") | after leaving a field | balanced, most common |
| On change | on every keystroke | noisy, good after an error is shown |

A popular combination: validate on submit, then **re-validate on change** so errors disappear as soon as they are fixed.

```jsx
const [submitted, setSubmitted] = useState(false);
const errors = submitted ? validate(values) : {};

function handleSubmit(event) {
  event.preventDefault();
  setSubmitted(true);
  if (Object.keys(validate(values)).length === 0) {
    onSubmit(values);
  }
}
```

Note `event.preventDefault()`: without it the browser performs a full-page form submission.

## Accessible errors

Sighted users see red text; screen reader users need the same information:

```jsx
<label htmlFor="email">Email</label>
<input
  id="email"
  name="email"
  aria-invalid={errors.email ? 'true' : undefined}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && <p id="email-error">{errors.email}</p>}
```

- `aria-invalid` announces the field as invalid.
- `aria-describedby` links the message, read after the label.
- Every input needs a `<label>`; placeholders are not labels.
- Moving focus to the first invalid field after submit helps keyboard users.

## Native constraint validation

HTML has built-in rules: `required`, `type="email"`, `minLength`, `pattern`, `min`/`max`. The browser blocks submission and shows its own bubbles. It is free and works without JavaScript, but the messages and styling are hard to control. Many apps add `noValidate` to the `<form>` to disable the bubbles and render custom messages, while keeping the attributes for semantics and mobile keyboards.

## Controlled vs uncontrolled

- **Controlled**: React state is the source of truth (`value` + `onChange`). Enables live validation, formatting and conditional fields, at the cost of a re-render per keystroke.
- **Uncontrolled**: the DOM keeps the value (`defaultValue`, read it on submit with `FormData` or refs). Fewer renders; React Hook Form and form actions build on this idea.

## The legacy way

Class components bound handlers in the constructor and merged state with `this.setState({ [event.target.name]: event.target.value })`. Then libraries such as **redux-form** (every keystroke dispatched to Redux) and **Formik** (controlled state plus Yup schemas) dominated. Today the typical stack is React Hook Form with a schema library such as Zod, or React 19 form actions, but both rest on the fundamentals above.

## Pitfalls

- Forgetting `preventDefault()` reloads the page.
- Storing `errors` in state and forgetting to clear them causes stale messages; derive them instead.
- Switching an input between `value={undefined}` and a string triggers the controlled/uncontrolled warning; always initialize values with `''`.
- Disabling the submit button until the form is valid hides *why* it cannot be submitted; prefer showing errors on submit.
