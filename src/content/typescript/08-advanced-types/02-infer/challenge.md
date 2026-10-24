Rebuild a few utility types with `infer`. The built-in `ReturnType`, `Parameters` and `Awaited` are **not** allowed.

1. `type MyReturnType<F>`: the return type of a function type, `never` for anything that is not a function.
2. `type MyParameters<F>`: the parameter list of a function type as a tuple, `never` for non-functions.
3. `type FirstArgument<F>`: the type of the first parameter of a function type, `never` when the function
   has no parameters or `F` is not a function.
4. `type UnwrapPromise<T>`: the value type of a `Promise`. Unwrap **one** level only
   (`UnwrapPromise<Promise<Promise<number>>>` is `Promise<number>`); non-promise types stay unchanged.
5. `type ToNumber<S>`: converts a numeric string literal into a number literal (`ToNumber<'42'>` is `42`),
   and anything that is not a numeric string into `never`.

```ts
type R = MyReturnType<(name: string) => boolean>; // boolean
type A = FirstArgument<(id: number, label: string) => void>; // number
```
