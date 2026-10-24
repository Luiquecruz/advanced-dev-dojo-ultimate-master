Use callback refs instead of ref objects and effects.

1. **`export function AutoFocusInput({ label })`** renders `<input aria-label={label} />` and focuses it **from a callback ref** as soon as the node is attached. Do not use `useEffect` or `useRef` in this file.
2. **`export function ContactList({ contacts, registry })`** renders a `<ul>` with one `<li>` per contact (`{ id, name }`, key by `id`, text is the name).
   - Each `<li>` registers its DOM node in the `registry` prop (a `Map`) with **`registry.set(contact.id, node)`** from a callback ref,
   - and **returns a cleanup** (React 19 style) that deletes its entry, so removed or unmounted items leave the map.
3. **`export default function App()`** renders a checkbox labeled **`Show search`** (a `<label>` wrapping an `<input type="checkbox">`) that, when checked, shows `<AutoFocusInput label="Search" />`.
