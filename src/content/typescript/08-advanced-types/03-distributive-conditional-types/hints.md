`MyExclude` and `MyExtract` rely on distribution: check `T extends U` and return `never` for the members you want to drop.
---
Both bugs come from the type parameter being **naked**. Wrap both sides of `extends` in a one-element tuple, like `[T] extends [never]`, to check the type as a whole.
---
For `IsUnion`, add a second type parameter with a default, `All = T`, that keeps the original union. Distribute over `T`; inside the true branch, `[All] extends [T]` is only true when the whole type equals the single member.
---
Remember to answer `false` for `never` before distributing, otherwise `IsUnion<never>` collapses to `never`. Your fixed `IsNever` can do that check.
