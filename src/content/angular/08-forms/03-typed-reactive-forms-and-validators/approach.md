1. In `forbiddenNameValidator`, lowercase the forbidden list once, then compare `control.value.trim().toLowerCase()` inside the returned function.
2. In `passwordsMatchValidator`, read both children through `group.get()` and return the error object when they differ.
3. Register the field validator on `username` and the group validator in the options object of `group()`.
4. Render the mismatch message with `form.hasError('passwordsMismatch') && form.controls.confirmPassword.dirty`.
5. Implement `addSkill()` with `push()` on the typed `FormArray`, then loop over `form.controls.skills.controls` binding `[formControlName]="index"`.
