1. Identify where each target lives: tabs are projected content (`contentChildren`), the input is in the component's own view (`viewChild`).
2. In `Tabs`, query the projected tabs and keep the selected index in a signal.
3. Derive the active tab with `computed()` so it reacts to both clicks and tabs being added.
4. Let each `Tab` inject its parent and compute whether it is active; show `<ng-content>` only then.
5. Render the tab buttons from the query signal with `aria-selected` bound to the comparison.
6. In `SearchBox`, query the `#field` reference and call `focus()` on its native element from the button handler.
