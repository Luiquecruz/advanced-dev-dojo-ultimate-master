## Queries are an accessibility audit

Testing Library asks: *how would a user find this element?* Sighted users read labels and button text; screen reader users navigate by **roles** and **accessible names**. If your test cannot find an element by role and name, a screen reader user probably cannot either. Fixing the test usually means fixing the component.

## Query priority

Use the first query that works, from top to bottom:

1. `getByRole('button', { name: 'Save' })`: the default choice. Works for almost everything.
2. `getByLabelText('Email')`: form fields.
3. `getByPlaceholderText`: only when there is truly no label (a placeholder is **not** a label).
4. `getByText`: non-interactive content (paragraphs, messages).
5. `getByDisplayValue`: filled form values.
6. `getByAltText`, `getByTitle`: images and titled elements.
7. `getByTestId`: last resort, when nothing user-visible identifies the element.

## Roles come from semantics

Native elements carry **implicit roles**. You get them for free by choosing the right tag:

| Markup | Role |
| --- | --- |
| `<button>` | `button` |
| `<a href="...">` | `link` (no `href`, no role) |
| `<h1>`...`<h6>` | `heading` with `level` |
| `<input type="text">` / `type="email"` | `textbox` |
| `<input type="checkbox">` | `checkbox` |
| `<ul>` / `<li>` | `list` / `listitem` |
| `<img alt="...">` | `img` (`alt=""` makes it `presentation`) |
| `<nav>`, `<main>`, `<form aria-label>` | `navigation`, `main`, `form` |

A `<div onClick>` has **no role**, cannot be focused with Tab and ignores Enter and Space. `getByRole('button')` will not find it, and neither will a keyboard user.

## Accessible names

The `name` option matches the **accessible name**, computed from (roughly in order) `aria-labelledby`, `aria-label`, a `<label>`, `alt`, the element's text content or `title`.

```jsx
<label htmlFor="email">Email</label>
<input id="email" type="email" />

<label>
  <input type="checkbox" /> Remember me
</label>

<button aria-label="Close dialog">×</button>
```

`getByLabelText('Email')` and `getByRole('textbox', { name: 'Email' })` both find the input. `useId()` generates stable ids for `htmlFor` without collisions.

## getBy, queryBy, findBy

| Variant | No match | Many matches | Use for |
| --- | --- | --- | --- |
| `getBy*` | throws | throws | elements that must be there now |
| `queryBy*` | returns `null` | throws | asserting absence: `expect(queryByRole('alert')).toBeNull()` |
| `findBy*` | rejects after timeout | rejects | elements that appear asynchronously (`await`) |

Each has an `*AllBy*` form that returns an array. Prefer `screen.getBy...` over destructuring from `render()`, and `within(element)` to scope queries to a region:

```jsx
const dialog = screen.getByRole('dialog', { name: 'Delete project' });
await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
```

## Live messages

Validation errors appear after an action. Give them `role="alert"` (or `aria-live="polite"` for non-urgent updates) so screen readers announce them, and query them with `getByRole('alert')`. Connect the message to its field with `aria-describedby` and mark the field with `aria-invalid`.

## Debugging

- `screen.debug()` prints the current DOM.
- `screen.getByRole('nope')` fails with a list of every accessible role and name in the document, often the quickest way to see what is missing.
- `logRoles(container)` from `@testing-library/dom` prints the role tree.

## Pitfalls

- Adding `data-testid` everywhere instead of fixing semantics.
- Placeholders as labels: they disappear while typing and are not reliably announced.
- `<img>` without `alt`: screen readers read the file name.
- Using ARIA to patch a `<div>` (`role="button" tabIndex={0}` plus key handlers) when `<button>` does all of it natively. The first rule of ARIA: do not use ARIA if a native element exists.
