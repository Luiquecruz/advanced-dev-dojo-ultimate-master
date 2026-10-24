`nonNullable.group({ email: ['', [Validators.required, Validators.email]] })`: each entry is `[initialValue, validators]`.
---
In the template, wire the group once with `[formGroup]="form"`, then each input with `formControlName="email"` (a string: the key in the group).
---
Read control state through `form.controls.email`: `@if (form.controls.email.touched && form.controls.email.hasError('email')) { ... }`. Error keys are lowercase: `required`, `email`, `minlength`.
---
`patchValue` updates only the keys you pass (`setValue` requires all of them). On submit: `if (this.form.valid) this.loggedIn.emit(this.form.getRawValue());`
