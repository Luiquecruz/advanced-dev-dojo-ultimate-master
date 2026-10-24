## Typed reactive forms

Since Angular 14, reactive forms are **strictly typed**. The type of each control is inferred from its initial value:

```ts
const form = new FormGroup({
  email: new FormControl('', { nonNullable: true }),
  age: new FormControl<number | null>(null),
});

form.value;          // Partial<{ email: string; age: number | null }>
form.getRawValue();  // { email: string; age: number | null }
form.controls.email.setValue(42); // ❌ type error
```

- `value` is `Partial<...>` because disabled controls are omitted. `getRawValue()` returns everything.
- Without `nonNullable`, `reset()` sets values to `null`, so the type becomes `string | null`.
- `inject(NonNullableFormBuilder)` (or `fb.nonNullable`) makes every control non-nullable.
- Declaring the form type explicitly documents the shape: `FormGroup<{ email: FormControl<string> }>`.

Before v14, every value was `any`. Migrated code shows `UntypedFormGroup` / `UntypedFormControl`, the escape hatch for gradual typing.

### Custom validators

A validator is a pure function:

```ts
export function forbiddenNameValidator(forbidden: string[]): ValidatorFn {
  const blocked = forbidden.map((name) => name.toLowerCase());
  return (control) =>
    blocked.includes(control.value.toLowerCase()) ? { forbiddenName: { value: control.value } } : null;
}

username: ['', [Validators.required, forbiddenNameValidator(['admin', 'root'])]]
```

Return `null` when valid and an error object otherwise. The key (`forbiddenName`) is what the template checks with `hasError('forbiddenName')`. Because validators are plain functions, you test them without any component.

### Cross-field validation

Rules like "passwords must match" involve **two** controls, so the validator goes on their parent group:

```ts
export const passwordsMatchValidator: ValidatorFn = (group) =>
  group.get('password')?.value === group.get('confirmPassword')?.value ? null : { passwordsMismatch: true };

this.formBuilder.group({ password: [''], confirmPassword: [''] }, { validators: passwordsMatchValidator });
```

The error lives on the **group**: `form.hasError('passwordsMismatch')`. Group validators re-run whenever any child changes.

### Async validators

```ts
export const usernameAvailable = (api: UserApi): AsyncValidatorFn => (control) =>
  api.exists(control.value).pipe(map((taken) => (taken ? { taken: true } : null)));

username: ['', { validators: [Validators.required], asyncValidators: [usernameAvailable(api)], updateOn: 'blur' }]
```

Async validators run only after the sync validators pass. While they run, the control is `pending`. `updateOn: 'blur'` avoids a request per keystroke.

### FormArray: dynamic lists

```ts
skills: this.formBuilder.array<FormControl<string>>([]),

addSkill() {
  this.form.controls.skills.push(this.formBuilder.control('', Validators.required));
}
```

```html
<fieldset formArrayName="skills">
  @for (skill of form.controls.skills.controls; track skill; let index = $index) {
    <input [formControlName]="index" />
  }
</fieldset>
```

`removeAt(index)`, `insert()`, `clear()` complete the API. `FormRecord` handles groups with dynamic keys.

### Pitfalls

- A validator that throws on `null` values breaks the whole form: guard values that can genuinely be empty.
- Returning a new error object reference each time is fine; returning `{}` is **not** valid (an empty object still counts as an error).
- Changing validators at runtime requires `updateValueAndValidity()` afterwards.
