Inject the base path once with `inject(API_BASE_PATH)` and build every URL from it: `` `${this.basePath}/courses/${id}` ``. The tests replace the token to prove nothing is hardcoded.
---
`HttpParams` is immutable: `params = params.set(name, value)` returns a new object, so assign the result back. It accepts numbers, strings and booleans.
---
Loop over `Object.entries(params)` and skip entries whose value is `undefined`. Compare with `!== undefined` instead of testing truthiness, otherwise `page: 0` disappears.
---
Type each call with its response: `this.http.delete<void>(url)` for the 204 case. Pass the query through the `params` option instead of gluing `?q=...` onto the string, so Angular does the encoding.
