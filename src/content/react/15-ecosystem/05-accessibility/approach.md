1. Replace the clickable `div`s with `<button type="button" role="tab">` inside a `role="tablist"` container named with `aria-label`.
2. Create a base id with `useId()` and derive the tab and panel ids from it so `aria-controls` and `aria-labelledby` point at each other.
3. Derive `aria-selected` and `tabIndex` from the `selected` index: only the selected tab is in the Tab order (roving tabindex).
4. Render a single `role="tabpanel"` with `tabIndex={0}` for the selected tab so keyboard users can Tab into its content.
5. Keep a ref array of the buttons. In one `onKeyDown` on the tablist, map ArrowRight, ArrowLeft (with wrap-around), Home and End to a target index.
6. For a handled key, prevent the default scroll, set the selected index and focus the target button.
