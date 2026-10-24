## Signal Forms

Signal Forms (`@angular/forms/signals`, stable since Angular 22) rethink forms around one idea: **your data model is a signal, and the form is a view over it**. There is no separate `FormGroup` holding a copy of the value.

```ts
import { form, FormField } from '@angular/forms/signals';

@Component({
  imports: [FormField],
  template: `
    <input [formField]="loginForm.email" />
    <input type="password" [formField]="loginForm.password" />
    <p>Typing: {{ model().email }}</p>
  `,
})
export class Login {
  readonly model = signal({ email: '', password: '' });
  protected readonly loginForm = form(this.model);
}
```

### Field trees

`form(model)` returns a **field tree** shaped exactly like the model:

```ts
const model = signal({ name: '', address: { city: '' }, tags: ['angular'] });
const profile = form(model);

profile.name;              // field
profile.address.city;      // nested field
profile.tags[0];           // array item field

profile.address.city().value();      // read
profile.address.city().value.set('Paris'); // write (also updates model())
```

Navigate with dots; **call** a field to get its `FieldState`:

| Signal | Meaning |
| --- | --- |
| `value()` | current value (writable) |
| `valid()` / `invalid()` / `errors()` | validation result |
| `touched()` | the user blurred the control |
| `dirty()` | the user changed the value through the UI |
| `disabled()`, `readonly()`, `hidden()`, `pending()` | logic state |

State bubbles up: `profile()` (the root) is dirty if any child is dirty and invalid if any child is invalid.

### The `[formField]` directive

`[formField]="profile.name"` connects a native `<input>`, `<select>` or `<textarea>`, or a custom component implementing `FormValueControl`. It converts types for you: `type="number"` writes numbers, checkboxes write booleans. It also reflects state into the DOM (`disabled`, `required`, `aria-invalid`...).

Two-way flow:

```
user types → model signal updated → computed/template re-render
model.set() from code → inputs updated
```

Programmatic writes don't mark fields dirty; `dirty` only tracks user interaction. To discard edits, call `reset(value)` on a field state: it restores values and clears `touched`/`dirty`.

### Compared with reactive forms

| Reactive forms | Signal Forms |
| --- | --- |
| `new FormGroup({ email: new FormControl('') })` | `form(signal({ email: '' }))` |
| `formControlName="email"` | `[formField]="f.email"` |
| `control.valueChanges` (Observable) | `f.email().value()` (signal, works in `computed`) |
| validators attached to controls | validation declared in a **schema** function |
| value copied into the form | your signal is the value |

Because the model is a plain signal, it composes with `computed`, `linkedSignal`, `resource` and stores without glue code. Reactive and template-driven forms remain supported, and `@angular/forms/signals/compat` helps mix them during migrations.

### Pitfalls

- Pass the **field**, not its value: `[formField]="f.name"`, never `[formField]="f.name().value()"`.
- `form()` needs an injection context: create it as a field initializer or pass `{ injector }`.
- Replace nested objects immutably (`model.update((m) => ({ ...m, address: { ...m.address, city } }))`) when writing the model by hand.

Next lesson: schemas, validators and `submit()`.
