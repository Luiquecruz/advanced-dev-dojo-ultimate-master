Show server validation errors next to the right fields in a Signal Forms signup. The project has one file, `app.ts`, with the types, the client rules and the template already written.

**`isProblemDetail(body: unknown): body is ProblemDetail`**

1. Returns `true` for an object with a numeric `status` or a string `title`, and `false` for everything else (`null`, strings, other objects).

**`SignupForm.onSubmit()`**

2. Call `submit(this.signupForm, async (root) => { ... })` so the action runs only when the client rules pass.
3. The action sends `POST /api/users` with `this.model()` as the body. On success, set `created` to the name and return `undefined`; the template then shows `Welcome, <name>!`.
4. When the request fails with an `HttpErrorResponse` whose `error` is a Problem Details document:
   - every entry of its `errors` list that names `name` or `email` becomes `{ fieldTree: root.<field>, kind: 'server', message }` for that field;
   - without such entries, return one form-level error `{ kind: 'server', message }` using `detail`, then `title`;
5. Any other failure (no response, an empty body, a body that is not a Problem Details document) returns the form-level error `Something went wrong, try again`.

Entries that name an unknown field are ignored. Never read `errors` before the type guard has accepted the body.
