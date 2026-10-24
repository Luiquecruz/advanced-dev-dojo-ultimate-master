Build a Tailwind status badge and a card. Both are **named exports** of `App.jsx`.

### `StatusBadge({ status, children })`

Render a `<span>` with these base classes on every status:
`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`

Add the tone classes for the `status` prop:

| status | classes |
| --- | --- |
| `success` | `bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200` |
| `warning` | `bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200` |
| `error` | `bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200` |

Render `children` inside the span.

**Do not build class names with template strings** like `` `bg-${color}-100` `` (the Tailwind scanner cannot see them). Use a lookup object with complete class strings.

### `Card({ title, children })`

Render an `<article>` with classes `rounded-xl border border-gray-200 p-4 shadow-sm md:p-6`, containing an `<h3>` with classes `text-lg font-semibold` showing `title`, followed by `children`.
