Three separate fixes: the `name` assignment in `HttpError`, the misspelled method in `NotFoundError`, and the body of `ServiceUnavailableError.isRetryable`.
---
`new.target` inside a constructor is the class that was called with `new`, so `this.name = new.target.name;` works for every subclass.
---
Rename `descibe` to `override describe()` and return `` `${super.describe()} [resource=${this.resource}]` ``. For retries: `return super.isRetryable() && this.retryAfterSeconds <= 60;`.
