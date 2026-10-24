Practice the three generations of ref APIs side by side.

1. **`export const LegacyInput`** is created with **`forwardRef`**. It receives `{ label }` and the forwarded `ref`, and renders `<label>{label}<input ref={ref} /></label>`.
2. **`export function ModernInput({ label, ref })`** renders the same markup using the React 19 **ref-as-prop** style (no `forwardRef`).
3. **`export class SearchForm extends Component`**:
   - creates `this.inputRef` with **`createRef()`**,
   - renders `<LegacyInput label="Search" ref={this.inputRef} />` and a `<button type="button">` **`Clear`**,
   - focuses the input in `componentDidMount`,
   - when `Clear` is clicked, sets the input's `value` to `''` and focuses it again.

The default export renders `SearchForm` and is already written.
