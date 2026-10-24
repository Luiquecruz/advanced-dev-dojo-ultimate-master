Build a reactive login form in `LoginForm` (`app.ts`).

1. Import `ReactiveFormsModule`.
2. Build `form` with `this.formBuilder.nonNullable.group(...)`:
   - `email`: `''`, validators `Validators.required` and `Validators.email`
   - `password`: `''`, validators `Validators.required` and `Validators.minLength(8)`
   - `remember`: `false`
3. Bind `<form [formGroup]="form" (ngSubmit)="submit()">` and connect each input with `formControlName` (labels `Email`, `Password`, `Remember me` are in the starter).
4. Error messages, only when the control is **touched**:
   - email `required` → `Email is required`
   - email `email` → `Enter a valid email`
   - password `minlength` → `Password must be at least 8 characters`
5. `Log in` (submit) is disabled while `form.invalid`.
6. `useDemoAccount()` uses `patchValue` to set email `demo@example.com` and password `demo-password`.
7. `submit()` emits `loggedIn` with `form.getRawValue()` when the form is valid.
