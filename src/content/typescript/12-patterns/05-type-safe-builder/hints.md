Start with the helper types: `type Missing<Done extends RequiredStep> = Exclude<RequiredStep, Done>;`, then `BuildArgs<Done>` returning `[]` when `[Missing<Done>] extends [never]` and a one-element tuple otherwise.
---
Give the class `<Done extends RequiredStep = never, M extends Method = Method>` and change each return type: `url()` adds `'url'` to `Done`, `method<N extends Method>(method: N)` adds `'method'` and replaces `M` with `N`.
---
For `body`, use `type BodyArg<M extends Method> = [M] extends ['POST' | 'PUT'] ? string : never;` as the parameter type. For immutability, add a private `#next(changes)` helper that returns `new RequestBuilder({ ...this.#config, ...changes })`, and copy `headers` before adding one.
---
`build(..._missing: BuildArgs<Done>): HttpRequest` keeps a runtime guard (`throw` when `url` or `method` is undefined) and only adds `body` to the result when it was set.
