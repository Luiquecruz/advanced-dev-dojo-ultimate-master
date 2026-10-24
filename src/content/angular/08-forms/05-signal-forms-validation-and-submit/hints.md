The schema function receives **paths**, not values: `required(path.email, { message: 'Email is required' })`. Each rule is a call, in any order.
---
`validate(path.confirmPassword, ({ value, valueOf }) => value() === valueOf(path.password) ? undefined : { kind: 'mismatch', message: 'Passwords do not match' })`. `valueOf` reads another field and makes the rule reactive to it.
---
Errors per field: `@if (signupForm.email().touched()) { @for (error of signupForm.email().errors(); track error.kind) { <p>{{ error.message }}</p> } }`.
---
Inside the submit action, `firstValueFrom(this.http.get<Array<{ email: string }>>('/api/users'))` turns the request into a promise. Returning an error with `fieldTree: field.email` attaches it to that field.
