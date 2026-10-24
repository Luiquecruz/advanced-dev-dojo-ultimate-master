## Why components need ids

Accessible HTML connects elements by **id**:

- `<label htmlFor="email">` focuses and names `<input id="email">`.
- `aria-describedby="email-hint"` makes screen readers announce a hint after the field name.
- `aria-labelledby`, `aria-controls` and `aria-activedescendant` reference other elements too.

Hard-coding an id inside a reusable component breaks as soon as it renders twice:

```jsx
function FormField({ label }) {
  return (
    <>
      <label htmlFor="field">{label}</label>
      <input id="field" />
    </>
  );
}
```

Two `FormField`s produce two `id="field"` elements. Clicking the second label focuses the **first** input, and assistive technology announces the wrong field.

## `useId` generates stable, unique ids

```jsx
import { useId } from 'react';

function FormField({ label, hint }) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={hintId} />
      <p id={hintId}>{hint}</p>
    </>
  );
}
```

- Each component instance gets its own id, stable across re-renders.
- Call `useId` **once** per component and derive related ids with suffixes, instead of calling it many times.
- In React 19.3 ids look like `_R_0_` on the server; the format is an implementation detail, so never parse it.

## Why not `Math.random()` or a counter?

| Approach | Problem |
| --- | --- |
| `Math.random()` in render | new id every render, breaks focus and announcements |
| `useState(() => Math.random())` | stable on the client, but the server generates a different value: **hydration mismatch** |
| module-level `let nextId = 0` | order differs between server and client and between requests |
| `useId()` | derived from the component's **position in the tree**, identical on server and client |

That last property is the reason `useId` exists: it makes ids safe for server rendering and hydration.

## Multiple React roots

If two separate React apps render on the same page, both could generate the same ids. Give each root a prefix:

```jsx
createRoot(container, { identifierPrefix: 'checkout-' });
hydrateRoot(container, <App />, { identifierPrefix: 'checkout-' });
```

Use the same prefix on the server (`renderToPipeableStream(<App />, { identifierPrefix })`).

## What `useId` is not for

- **List keys**: keys must come from your data (`todo.id`). A `useId` call inside a list item would not even be available to the parent rendering the list.
- **Database or entity ids**: generate those with `crypto.randomUUID()` when creating the data, not during render.
- **CSS selectors**: the format may contain characters that need escaping in some versions; use `ref` or `data-` attributes to target elements.

## Legacy vs modern

Before React 18, libraries shipped their own "auto id" helpers (Reach UI's `useId`, `lodash.uniqueId`) and accepted an `id` prop as a workaround for SSR mismatches. React 18 added `useId` as the built-in solution. Component libraries (Radix, React Aria, MUI) now use it internally.
