Build two generic components.

1. **`export interface ListProps<T>`** (or `type`) with `items: T[]` (or `readonly T[]`), `renderItem: (item: T) => ReactNode`, `getKey: (item: T) => string | number` and `emptyText?: string`.
2. **`export function List<T>(props: ListProps<T>)`** renders a `<ul>` with one `<li>` per item, keyed by `getKey(item)` and containing `renderItem(item)`. When `items` is empty, it renders `<p>{emptyText}</p>` instead, with `emptyText` defaulting to **`No items`**.
3. **`export interface SelectProps<T>`** with `label: string`, `options: T[]`, `value: T`, `getLabel: (option: T) => string`, `getValue: (option: T) => string` and `onChange: (option: T) => void`.
4. **`export function Select<T>(props: SelectProps<T>)`** renders `<label>{label} <select>...</select></label>` with one `<option value={getValue(option)}>{getLabel(option)}</option>` per option, `value={getValue(value)}` on the `<select>`, and calls `onChange` with the **original option object** matching the chosen value.

The default export `App` is already written and uses both components.
