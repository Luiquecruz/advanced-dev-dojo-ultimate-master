`Simplify` is an identity mapped type: `{ [K in keyof T]: T[K] }`. Add `& {}` at the end to keep tooltips expanded.
---
Make `option` generic with `<K extends string, V>` and return `Chainable<T & Record<K, V>>`. For the duplicate check, type the parameter as `K extends keyof T ? never : K`.
---
In `createChainable`, write `option` with the same generic signature and assert the new state: `createChainable({ ...state, [key]: value } as T & Record<K, V>)`.
