A `ValidatorFn` is `(control: AbstractControl) => ValidationErrors | null`. A **factory** like `forbiddenNameValidator(list)` returns such a function, closing over its configuration.
---
A group validator receives the `FormGroup` itself. Read children with `group.get('password')?.value`. Attach it with the second argument of `group()`: `this.formBuilder.group({...}, { validators: passwordsMatchValidator })`.
---
Group errors live on the group: `form.hasError('passwordsMismatch')`, not on `confirmPassword`.
---
FormArray in the template: `@for (skill of form.controls.skills.controls; track skill; let index = $index) { <input [formControlName]="index" [attr.aria-label]="'Skill ' + (index + 1)" /> }`, and `this.form.controls.skills.push(this.formBuilder.control('', Validators.required))`.
