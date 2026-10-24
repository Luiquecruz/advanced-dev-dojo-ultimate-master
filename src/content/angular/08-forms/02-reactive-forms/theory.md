## Reactive forms

In reactive forms the **model lives in the class**. You build a tree of `FormControl`, `FormGroup` and `FormArray` objects in TypeScript and the template only connects inputs to it. The form exists synchronously, is fully typed and can be unit tested without rendering.

### Building the model

```ts
@Component({
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="email" />
      <input type="password" formControlName="password" />
      <button [disabled]="form.invalid">Log in</button>
    </form>
  `,
})
export class LoginForm {
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit() {
    if (this.form.valid) {
      console.log(this.form.getRawValue()); // { email: string; password: string }
    }
  }
}
```

Without `FormBuilder` the same model reads:

```ts
form = new FormGroup({
  email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
});
```

- `[formGroup]` binds the group to the `<form>`; `formControlName="email"` binds an input by key. Nested groups use `formGroupName`, lists use `formArrayName`.
- `nonNullable` matters: by default `reset()` sets values to `null`, so every value type becomes `string | null`.

### Reading state and errors

Each control has `value`, `valid`/`invalid`, `errors`, `touched`, `dirty`, `pending` and `disabled`:

```html
@if (form.controls.email.touched && form.controls.email.hasError('email')) {
  <p>Enter a valid email</p>
}
```

Error keys are lowercase (`required`, `email`, `minlength`, `maxlength`, `pattern`, `min`, `max`). The error object carries details: `{ minlength: { requiredLength: 8, actualLength: 5 } }`.

### Updating from code

```ts
this.form.patchValue({ email: 'demo@example.com' }); // some keys
this.form.setValue({ email: 'a@b.c', password: 'secret123' }); // all keys
this.form.reset();
this.form.controls.password.disable();
this.form.markAllAsTouched(); // reveal every error on submit
```

### Reacting to changes

Every control exposes RxJS streams:

```ts
readonly emailValue = toSignal(this.form.controls.email.valueChanges, { initialValue: '' });

this.form.controls.country.valueChanges.pipe(takeUntilDestroyed()).subscribe((country) => {
  this.form.controls.zip.setValidators(zipValidatorFor(country));
});
```

Angular 21 added unified `events` (`ValueChangeEvent`, `TouchedChangeEvent`, `FormSubmittedEvent`...) on every control.

### Reactive vs template-driven vs Signal Forms

Reactive forms became the standard for complex forms: typed models (since v14), synchronous access, dynamic `FormArray`s and reusable validator functions. They still rely on observables and on a separate state object you must keep in sync with your domain model. **Signal Forms** keep the same ideas but make *your own signal* the source of truth. Existing reactive forms keep working; you can migrate gradually.

### Pitfalls

- Using `[formControl]` on an input inside a `[formGroup]` when you meant `formControlName`: the input becomes detached from the group.
- Setting `[disabled]` on an input bound to a control: Angular warns. Call `control.disable()` instead.
- Forgetting `ReactiveFormsModule` in `imports`: `[formGroup]` is then an unknown property and the template fails.
