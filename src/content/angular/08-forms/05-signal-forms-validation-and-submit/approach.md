1. Declare the built-in rules (`required`, `email`, `minLength`) on their paths with custom messages.
2. Add the cross-field rule with `validate()` on `confirmPassword`, reading the password through `valueOf(path.password)`.
3. In the template, wrap each field's `@for` over `errors()` inside an `@if` on `touched()`.
4. Bind the submit button's `disabled` to the root `submitting()` signal.
5. In `onSubmit`, call `submit()` with an async action: fetch users, return a field-scoped server error when the email exists, otherwise store the email in `registered`.
