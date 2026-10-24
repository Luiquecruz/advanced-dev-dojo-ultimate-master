Build a headless disclosure hook with prop getters, then skin it.

**`export function useDisclosure({ defaultOpen = false } = {})`** returns:

- `isOpen` (boolean, starts at `defaultOpen`), and `open()`, `close()`, `toggle()`.
- **`getButtonProps(props = {})`** returning the user props merged with:
  - `type: 'button'`, `'aria-expanded': isOpen`, `'aria-controls'` set to the panel id,
  - an `onClick` that **first calls the user's `onClick`** (if any) and then toggles.
- **`getPanelProps(props = {})`** returning the user props merged with `id` (the panel id, generated with **`useId`**) and `hidden: !isOpen`.

**`export default function FaqItem({ question = 'What is a headless component?', answer = 'Logic without markup.' })`** uses the hook to render a `<button>` with the `question` and a `<p>` with the `answer` (the panel).
