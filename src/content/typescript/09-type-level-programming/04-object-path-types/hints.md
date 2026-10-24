Compute one result per key with a mapped type and then index it with its own keys: `{ [K in keyof T & string]: ... }[keyof T & string]`.
---
For each key, check leaves first: `T[K] extends readonly unknown[] | ((...args: never[]) => unknown) ? K : ...`. Only then check `T[K] extends object` and return `K | `${K}.${Paths<T[K]>}``.
---
`Get` peels off one segment with `` P extends `${infer Head}.${infer Rest}` ``. If `Head` is a key of `T`, recurse with `Get<T[Head], Rest>`; otherwise return `never`. Without a dot, return `T[P]` when `P` is a key.
---
At runtime, keep a `current: unknown` variable, loop over `path.split('.')` and read `(current as Record<string, unknown>)[segment]`; assert the final value to `Get<T, P>`.
