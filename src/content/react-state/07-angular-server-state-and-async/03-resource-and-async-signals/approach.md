1. Inject the fetch function and keep the id in a signal.
2. Create the resource with reactive params and a loader that forwards the abort signal.
3. Make `params` return `undefined` for a null id.
4. Derive `title` from `hasValue()`.
5. Expose `select` and `reload` as thin methods.
