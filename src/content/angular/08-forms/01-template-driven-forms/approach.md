1. Add `FormsModule` to `imports` so `ngModel`, `ngForm` and the validator directives exist.
2. Turn the `<form>` into an `NgForm` reference and wire `(ngSubmit)`.
3. Give each input a `name`, a `[(ngModel)]` binding to its signal and the validator attributes.
4. Export the name control with `#nameModel="ngModel"` and render the error inside `@if (nameModel.invalid && nameModel.touched)`.
5. Bind `[disabled]="signupForm.invalid"` on the button.
6. Implement `subscribe()`: save the name first, then `resetForm()` (which clears values and the touched/submitted state).
