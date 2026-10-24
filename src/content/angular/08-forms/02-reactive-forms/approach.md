1. Add `ReactiveFormsModule` to `imports`.
2. Create the group with `nonNullable.group` so `reset()` returns to the initial values and the value types have no `null`.
3. Bind `[formGroup]` and `(ngSubmit)` on the form and add `formControlName` to the three inputs.
4. Render each error inside an `@if` that checks `touched` plus `hasError('<key>')`.
5. Bind `[disabled]="form.invalid"` on the submit button.
6. Implement `useDemoAccount()` with `patchValue` and `submit()` with a validity check and `emit(getRawValue())`.
