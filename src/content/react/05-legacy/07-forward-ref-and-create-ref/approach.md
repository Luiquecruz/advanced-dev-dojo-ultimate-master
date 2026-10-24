1. Turn `LegacyInput` into `export const LegacyInput = forwardRef(function LegacyInput({ label }, ref) { ... })` and attach `ref` to the input.
2. In `ModernInput`, destructure `ref` from props and attach it. Compare: same result, no wrapper.
3. In `SearchForm`, create the ref as a class field so it is created once per instance.
4. Pass the ref to `LegacyInput`; `forwardRef` routes it to the inner `<input>`.
5. Focus in `componentDidMount`, when the DOM node is guaranteed to exist.
6. In `clear`, write to the DOM node directly (the input is uncontrolled) and focus it.
