Put the type parameter on both the props type and the function: `interface ListProps<T> { items: T[]; renderItem: (item: T) => ReactNode; ... }` and `function List<T>({ ... }: ListProps<T>)`.
---
Return early for the empty case: `if (items.length === 0) return <p>{emptyText}</p>;`. `emptyText = 'No items'` in the destructuring gives the default.
---
In `Select`, render `options.map((option) => <option key={getValue(option)} value={getValue(option)}>{getLabel(option)}</option>)`. In the change handler, find the object back: `options.find((option) => getValue(option) === event.target.value)` and call `onChange` when it is defined.
