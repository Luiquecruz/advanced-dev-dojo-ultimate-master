Each `Panel` currently manages its own `isActive` state, so several panels can be open at the same time. Refactor the accordion so **only one panel is open at a time**.

1. `export function Panel({ title, isActive, onShow, children })` must have **no state**. It renders a `<section>` with an `<h3>` title and then:
   - `<p>{children}</p>` when `isActive` is `true`,
   - otherwise a `<button>` with the text `Show` that calls `onShow` when clicked.
2. The default export `Accordion` owns an `activeIndex` state that starts at **`0`** (the first panel is open). It renders an `<h2>` `Almaty, Kazakhstan` and two panels:
   - `About`: `Almaty is the largest city in Kazakhstan.`
   - `Etymology`: `The name comes from the Kazakh word for apple.`
3. Clicking `Show` on a panel opens it and closes the other one.
