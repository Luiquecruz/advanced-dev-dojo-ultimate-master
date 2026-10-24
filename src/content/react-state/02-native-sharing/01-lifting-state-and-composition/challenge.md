The sales `Dashboard` owns every piece of state: the search `query`, the `selectedId` and the `accent` color. As a result, `SalesChart` (expensive) re-renders on every keystroke, every selection and every accent change. Fix it by **restructuring the tree**, without `memo`, `useMemo` or `useCallback`.

Keep the existing pieces (`orders`, `SalesChart`, `SearchBox`, `OrderList`, `SelectionSummary`) and the default export `Dashboard({ onChartRender })`, which must pass `onChartRender` to `SalesChart` as `onRender` (the tests count chart renders with it).

1. Create `SearchPanel`: it owns `query` and `selectedId` (the closest common parent of `SearchBox`, `OrderList` and `SelectionSummary`) and renders those three inside a `<section>`.
2. Create `AccentFrame({ children })`: it owns `accent` and renders `<div className={`frame frame-${accent}`} data-testid="frame">` containing the `Accent` select and then `children`.
3. `Dashboard` holds no state: it renders `AccentFrame` with `SearchPanel` and `SalesChart` as its children.

Observable behavior:

- Typing in `Search orders` filters the list (product name, case-insensitive) and clicking an order shows `Selected: {product} ({region})` (otherwise `No order selected`).
- Choosing `teal` in `Accent` sets the class `frame-teal`.
- None of these interactions re-render `SalesChart`.
