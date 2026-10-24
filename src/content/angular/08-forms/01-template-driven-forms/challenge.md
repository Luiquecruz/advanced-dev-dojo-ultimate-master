Build a template-driven newsletter form in the `Newsletter` component (`app.ts`).

1. Import `FormsModule`.
2. Export the form as `#signupForm="ngForm"` and call `subscribe(signupForm)` on `(ngSubmit)`.
3. A **Name** input (`<label>Name <input ... /></label>`): `name="name"`, `[(ngModel)]="name"`, `required`, `minlength="2"`, exported as `#nameModel="ngModel"`.
4. When `nameModel` is invalid **and** touched, show `<p>Name must be at least 2 characters</p>`. Nothing before the field is touched.
5. An **Email** input (`<label>Email <input ... /></label>`): `name="email"`, `[(ngModel)]="email"`, `required`, `email`.
6. The `Subscribe` submit button is disabled while `signupForm.invalid`.
7. `subscribe(form)` stores the current name in `subscribed` (the template then shows `Thanks, <name>!`) and clears the form with `form.resetForm()`.
