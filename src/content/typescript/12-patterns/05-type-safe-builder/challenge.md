`RequestBuilder` builds an `HttpRequest`, but the compiler lets you call `build()` before the URL or the method exist, and send a body with `GET`. Turn it into a **type-state builder**: the type of each builder records which steps are done.

1. Add two type parameters: `RequestBuilder<Done extends RequiredStep = never, M extends Method = Method>`.
   - `Done` is the union of required steps already called (`'url'`, `'method'`).
   - `M` is the method chosen with `method()` (`Method` until then).
2. Steps return a **new** builder (never `this`) with the updated types:
   - `url(url)` → `RequestBuilder<Done | 'url', M>`
   - `method<N extends Method>(method: N)` → `RequestBuilder<Done | 'method', N>`
   - `header(name, value)` and `timeout(ms)` → `RequestBuilder<Done, M>`
   - `body(body)` only accepts a `string` when `M` is `'POST'` or `'PUT'`; otherwise its parameter type is `never`.
3. `build()` compiles only when `Done` contains both `'url'` and `'method'`. Use a conditional rest parameter (`...args: BuildArgs<Done>`): `[]` when nothing is missing, otherwise one impossible argument such as `` [missing: `Missing step: ${Missing<Done>}`] `` so the error names the missing step.
4. At runtime `build()` returns `{ url, method, headers, timeoutMs }` with `headers` defaulting to `{}` and `timeoutMs` to `5000`, plus `body` only when one was set.

```ts
request().url('/users').method('GET').build();          // OK
request().url('/users').build();                         // Error: Missing step: method
request().url('/users').method('GET').body('{}');        // Error: body needs POST or PUT
const base = request().url('/items');                    // safe to reuse: steps never mutate it
```

No `any`, no `as unknown` / `as never` casts.
