1. Declare `CssLength` as a template literal type combining the open-ended `number` placeholder with the `CssUnit` union.
2. Build `ChangeEvent` by placing the string keys of `T` (`string & keyof T`) before the `Changed` suffix; the union expands per key.
3. Write `ParseVersion` as a conditional type matching a dotted template literal pattern with three `infer ... extends number` holes, returning the object in the true branch and `never` otherwise.
4. Give `toPx` the return type `` `${N}px` `` and return a template string; contextual typing keeps the literal type.
