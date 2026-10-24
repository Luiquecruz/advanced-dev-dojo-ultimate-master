Finish a typed signup form with **custom validators**. The project has two files.

**`validators.ts`**

1. `forbiddenNameValidator(forbidden: string[]): ValidatorFn` returns `{ forbiddenName: { value: control.value } }` when the trimmed value equals one of the names, ignoring case (`'Admin'`, `' root '`). Otherwise `null`.
2. `passwordsMatchValidator: ValidatorFn` is a **group** validator: it reads the `password` and `confirmPassword` children and returns `{ passwordsMismatch: true }` when they differ, `null` when equal.

**`app.ts`** (`Signup` component, typed with `NonNullableFormBuilder`)

3. Add `forbiddenNameValidator(['admin', 'root'])` to `username`.
4. Pass `{ validators: passwordsMatchValidator }` as the second argument of `group()`.
5. Show `Passwords do not match` when the group has the `passwordsMismatch` error **and** `confirmPassword` is dirty.
6. `addSkill()` pushes a new control (`''`, `Validators.required`) into the `skills` `FormArray`. Render one input per skill inside the `formArrayName="skills"` fieldset with `[formControlName]="index"` and `aria-label` `Skill 1`, `Skill 2`...
