`submit()` takes the form and an async action. Inside it, `await firstValueFrom(this.http.post('/api/users', this.model()))` turns the request into a promise, so a failure becomes an exception you can catch.
---
In the `catch` block, check `error instanceof HttpErrorResponse && isProblemDetail(error.error)` first. Only after that is it safe to read `error.error.errors`; a 502 with an empty body gives `null` there.
---
Return `{ fieldTree: root.email, kind: 'server', message }` to attach a message to a field, and the same object without `fieldTree` for the whole form. Return an array when there are several errors.
---
Look the field up in a fixed table, `{ name: root.name, email: root.email }`, instead of indexing `root` with the string from the server. Skip names that are not in the table.
