## Rendering lists with `map`

JSX renders arrays, so turning data into a list of elements is plain JavaScript: transform the array with `map`.

```jsx
const people = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
];

function PeopleList() {
  return (
    <ul>
      {people.map((person) => (
        <li key={person.id}>{person.name}</li>
      ))}
    </ul>
  );
}
```

Chain `filter`, `sort` (on a copy) or `slice` before `map` to show a subset:

```jsx
const admins = users.filter((user) => user.role === 'admin');
const sorted = [...products].sort((a, b) => a.price - b.price);
```

Do this during render. You do not need to store the filtered list anywhere: it is recalculated from the source data every time.

## Why keys exist

Every element in an array needs a **`key`**: a string or number that identifies the item among its siblings. When the list changes (items inserted, removed, reordered), React matches old and new elements **by key**, not by position. That tells it which DOM nodes and which component **state** belong to which item.

Without stable keys, React falls back to the index. Insert an item at the top and every row is now "the item at a different position": React updates every row's content and, worse, the state of row 0 (an input value, an open menu, a checkbox) stays at position 0 and now belongs to the wrong item.

## Choosing a key

| Source | Good key? |
| --- | --- |
| Database id (`product.id`) | ✅ Best choice |
| Stable unique field (`user.email`, a slug) | ✅ |
| `crypto.randomUUID()` assigned **when the item is created** and stored with it | ✅ |
| Array index | ⚠️ Only for static lists that never reorder, filter or insert |
| `Math.random()` / `crypto.randomUUID()` **during render** | 🔴 A new key every render remounts every item |

Keys only need to be unique among **siblings**, not globally.

## Rules and pitfalls

- The key goes on the **outermost element returned from `map`**, not on an element inside it.
- Extracting the row into a component? Put the key on the component: `<ProductRow key={product.id} product={product} />`.
- `key` is not passed as a prop. If the child needs the id, pass it separately (`id={product.id}`).
- Need several elements per item without a wrapper? Use `<Fragment key={item.id}>` (the `<>` short syntax cannot take a key).
- In development, React warns: *Each child in a list should have a unique "key" prop.* Do not silence it with indexes.

## Empty states

A list of zero items renders nothing, which users read as "broken". Render an explicit message:

```jsx
if (visible.length === 0) {
  return <p>No products found.</p>;
}
```

## Formatting values

Lists often show prices or dates. `Intl.NumberFormat` and `toLocaleString` produce localized output; for the exercises here, template literals are enough: `` `${name}: $${price}` ``.

## Legacy note

Before JSX handled arrays well, people wrote loops with `push` into an array and rendered it. That still works, but `map` keeps the render body a single expression and is the idiomatic approach.
