## Validation with schemas

Signal Forms declare validation in a **schema function**, passed as the second argument of `form()`. It runs once and receives a tree of **paths** that mirrors the model:

```ts
readonly signupForm = form(this.model, (path) => {
  required(path.email, { message: 'Email is required' });
  email(path.email, { message: 'Enter a valid email' });
  minLength(path.password, 8, { message: 'Password must be at least 8 characters' });
  required(path.company, { when: ({ valueOf }) => valueOf(path.accountType) === 'business' });
});
```

Rules are reactive: they re-evaluate when the values they read change. Every rule accepts `message` (or a full `error`) and `when` for conditional validation. Built-ins: `required`, `email`, `min`, `max`, `minLength`, `maxLength`, `pattern`, `minDate`, `maxDate`.

Reusable bundles of rules are just functions, or `schema()` objects applied with `apply(path.address, addressSchema)`.

### Custom rules with validate()

```ts
validate(path.confirmPassword, ({ value, valueOf }) =>
  value() === valueOf(path.password) ? undefined : { kind: 'mismatch', message: 'Passwords do not match' },
);
```

The context gives `value()` for the current field and `valueOf()`/`stateOf()` for others. Return `undefined` (valid) or one or more `{ kind, message }` errors. Compare with reactive forms, where a cross-field check needed a validator on the parent `FormGroup` and the error lived on the group, not the field the user is looking at.

Async checks use `validateHttp()` or `validateAsync()` with a resource; the field is `pending()` meanwhile. `debounce(path.username, 300)` throttles them.

### Displaying errors

```html
@if (signupForm.email().touched()) {
  @for (error of signupForm.email().errors(); track error.kind) {
    <p class="error">{{ error.message }}</p>
  }
}
```

Each error has a `kind` (`required`, `email`, `minLength`, your custom kinds...) and a `message`. `errorSummary()` on a parent collects the errors of all descendants, handy for a summary at the top of a form. `[formField]` also sets `aria-invalid` and `required` on native inputs automatically.

### Submitting

```ts
async onSubmit(event: Event) {
  event.preventDefault();
  await submit(this.signupForm, async (field) => {
    const result = await this.api.register(field().value());
    if (result === 'EMAIL_TAKEN') {
      return { fieldTree: field.email, kind: 'server', message: 'Email already registered' };
    }
    return undefined;
  });
}
```

`submit()`:

1. marks every field as **touched**, revealing all errors;
2. runs the action only when the form is valid (`onInvalid` callback otherwise);
3. sets `submitting()` to `true` while the promise runs, perfect for disabling the button;
4. attaches returned errors to the fields named by `fieldTree` (or the root when omitted);
5. resolves to `true` when the action returned no errors.

You can also configure the action once, `form(model, schema, { submission: { action } })`, and let the `FormRoot` directive (`<form [formRoot]="signupForm">`) handle the submit event and `preventDefault()` for you.

### Reactive forms vs Signal Forms validation

| Reactive forms | Signal Forms |
| --- | --- |
| `Validators.minLength(8)` on the control | `minLength(path.password, 8)` in the schema |
| group validator for cross-field rules | `validate()` on the field itself with `valueOf()` |
| error object `{ minlength: {...} }` | list of `{ kind, message }` errors |
| manual `markAllAsTouched()` + `if (form.valid)` | `submit()` does both and tracks `submitting()` |
| server errors via `setErrors()` | return them from the submit action |

### Pitfalls

- Rules belong in the schema, not in `computed()`s scattered in the component.
- Return `undefined` for "valid". An empty object is not a valid result.
- Always call `event.preventDefault()` on a native `(submit)`; otherwise the browser reloads the page.
