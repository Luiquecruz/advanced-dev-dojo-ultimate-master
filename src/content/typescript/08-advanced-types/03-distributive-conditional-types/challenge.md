A teammate wrote some union helpers but two of them misbehave because of **distribution**. Fix the bugs
and finish the missing helpers. The built-in `Exclude` and `Extract` are **not** allowed.

1. `type MyExclude<T, U>`: removes from `T` every member assignable to `U`.
2. `type MyExtract<T, U>`: keeps only the members of `T` assignable to `U`.
3. **Fix** `type IsNever<T>`: it must return `true` for `never` (today it returns `never`) and `false` for
   everything else.
4. **Fix** `type ArrayOf<T>`: it must produce **one** array of the whole union:
   `ArrayOf<string | number>` is `(string | number)[]`, not `string[] | number[]`.
5. `type IsUnion<T>`: `true` for unions with two or more members (including `boolean`), `false` for single
   types and for `never`.
