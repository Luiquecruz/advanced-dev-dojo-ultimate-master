Type a `Card` component with TypeScript.

1. Declare a props type named **`CardProps`** (`type` or `interface`) with:
   - `title: string`
   - `subtitle?: string`
   - `variant?: 'info' | 'warning'` (a union of string literals; an alias like `type Variant = 'info' | 'warning'` is fine)
   - `onClose?: () => void`
   - `children: ReactNode` (import the type from `react`)
2. **`export function Card(props: CardProps)`** (destructuring with `: CardProps` is expected) renders an `<article>` with:
   - `data-variant` equal to `variant`, defaulting to **`'info'`**,
   - an `<h3>` with the `title`,
   - a `<p>` with the `subtitle`, **only when provided**,
   - the `children`,
   - a `<button>` **`Close`** that calls `onClose`, **only when `onClose` is provided**.
3. No `any` in the file.
