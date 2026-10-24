## One component, many item types

A `List` that renders users today and products tomorrow is a common need. Typing its items as `any` loses safety; writing `UserList` and `ProductList` duplicates code. **Generic components** solve it: the item type becomes a type parameter, inferred from the props at each call site.

```tsx
import type { ReactNode } from 'react';

interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string | number;
}

export function List<T>({ items, renderItem, getKey }: ListProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}
```

```tsx
<List
  items={users}
  getKey={(user) => user.id}
  renderItem={(user) => <strong>{user.name}</strong>}
/>
```

TypeScript infers `T = User` from `items`, so inside `renderItem` the `user` parameter is fully typed. `user.nmae` is a compile error. You never write `<List<User> ...>` explicitly (although JSX allows it when inference needs help).

## Arrow function syntax in .tsx

In a `.tsx` file, `<T>` before an arrow function looks like a JSX tag:

```tsx
const List = <T,>(props: ListProps<T>) => { /* ... */ };
const List = <T extends unknown>(props: ListProps<T>) => { /* ... */ };
```

The trailing comma or an `extends` clause disambiguates it. Function declarations (`function List<T>(...)`) do not have this problem, one reason many teams prefer them for components.

## Constraints

Use `extends` when the component needs something from every item:

```tsx
interface Identifiable {
  id: string | number;
}

function Table<T extends Identifiable>({ rows }: { rows: T[] }) {
  return rows.map((row) => <tr key={row.id}>{/* ... */}</tr>);
}
```

Now the component can read `row.id`, and callers can only pass rows that have one. A `keyof T` prop lets callers pick a column in a type-safe way: `sortBy: keyof T`.

## Generic callbacks keep data typed end to end

A `Select` that works with objects (not just strings) shows the real benefit: `onChange` hands back the **original object**, typed:

```tsx
interface SelectProps<T> {
  options: T[];
  value: T;
  getLabel: (option: T) => string;
  getValue: (option: T) => string;
  onChange: (option: T) => void;
}
```

```tsx
<Select options={products} value={product} getLabel={(p) => p.name} getValue={(p) => String(p.id)} onChange={setProduct} />
```

`setProduct` must accept a `Product`: passing `setUser` is a type error. Inside the component, the DOM gives you a string (`event.target.value`), and you map it back to the object with `getValue`.

## Legacy vs modern

- Before generic components were common, libraries typed such props as `any` or forced callers to cast (`onChange={(value) => setProduct(value as Product)}`).
- **`React.FC` cannot express generics**: `const List: React.FC<ListProps<T>>` has nowhere to declare `T`. This was a major reason the community moved to plain function declarations.
- `forwardRef` also erased generics (its return type is not generic). React 19's ref-as-prop removes that limitation: `function List<T>({ ref, ...props }: ListProps<T> & { ref?: Ref<HTMLUListElement> })`.
- `memo` returns a non-generic type too; libraries cast the result back: `export const List = memo(ListImpl) as typeof ListImpl`.

## Real-world examples

TanStack Table (`useReactTable<TData>`), TanStack Query (`useQuery<TData, TError>`), React Hook Form (`useForm<FormValues>`), and every design-system `Select`, `Combobox`, `DataGrid` are generic for exactly these reasons.

## Pitfalls

- Constraining too early (`T extends { id: number }`) when the component only needs `getKey`.
- Using `T[]` when callers pass readonly arrays (`as const` data): accept `readonly T[]` if you do not mutate.
- `Array.prototype.find` returns `T | undefined`: handle the missing case instead of asserting with `!`.
- The Dojo engine strips types without checking them, so tests inspect your generic declarations in the source. In a real project, your editor and `tsc` enforce them.
