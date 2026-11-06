1. Implement `isProblemDetail` first: reject anything that is not a non-null object, then accept a numeric `status` or a string `title`. It is the gate for everything that follows.
2. In `onSubmit`, wrap the work in `submit()` so client validation runs first and an invalid form never reaches the server.
3. Turn the request into a promise and treat success as the short path: set `created` and return `undefined`.
4. In the failure path, return early for every error that is not an `HttpErrorResponse` with a Problem Details body. That one guard clause protects the code below it from `null` and text bodies.
5. Build a small lookup of the form's fields and map each entry of `errors` through it, dropping entries that name an unknown field. A message that is attached to a field appears where the user is looking and clears when they edit it.
6. If no entry matched a field, fall back to one form-level error with `detail ?? title`, which the template renders as an alert.
