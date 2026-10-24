1. Declare `ListProps<T>` and rewrite `List` as `function List<T>(props: ListProps<T>)`; remove every `any`.
2. Handle the empty list with an early return and a defaulted `emptyText`.
3. Declare `SelectProps<T>`; every callback receives or returns `T`, so the caller's type flows through.
4. Render the options using `getValue` for the DOM value and `getLabel` for the text; set the `<select>` value from `getValue(value)`.
5. In the change handler (typed `ChangeEvent<HTMLSelectElement>`), map the string back to the original object with `find` and call `onChange` only when found.
6. Check `App`: without any explicit type arguments, `T` is inferred as `Product` for both components.
