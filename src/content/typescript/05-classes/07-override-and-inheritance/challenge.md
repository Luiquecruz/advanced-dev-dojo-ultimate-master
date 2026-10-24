An HTTP error hierarchy has three bugs. Fix them without changing the public API.

1. **Every class must report its own name**: `new NotFoundError('User').name` must be `"NotFoundError"` and
   `new ServiceUnavailableError(30).name` must be `"ServiceUnavailableError"`. Set it once in `HttpError`
   with `new.target.name` instead of hard-coding it.
2. **`NotFoundError` must override `describe`** (the starter misspells it). Mark it with `override` and build
   it on `super.describe()`, appending `" [resource=<resource>]"`.
3. **`ServiceUnavailableError.isRetryable()`** must reuse `super.isRetryable()` and additionally require
   `retryAfterSeconds <= 60`.

Expected results:

```ts
new HttpError(500, 'Boom').describe();          // "HttpError 500: Boom"
new NotFoundError('User').describe();           // "NotFoundError 404: User not found [resource=User]"
new ServiceUnavailableError(30).isRetryable();  // true
new ServiceUnavailableError(120).isRetryable(); // false
```
