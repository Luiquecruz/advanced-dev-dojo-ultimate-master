Build a tab group with `contentChildren()` and a search box with `viewChild()`.

**`Tab`** (selector `app-tab`): required input `label`, and renders its projected content **only when it is the active tab**.

**`Tabs`** (selector `app-tabs`)

1. Queries its projected `Tab` children with `contentChildren(Tab)`.
2. Renders one `<button role="tab">` per tab, labelled with `tab.label()`, with `aria-selected` set to `"true"` for the active tab and `"false"` otherwise. Clicking a button activates that tab.
3. The first tab is active initially. Then `<ng-content />`.

**`SearchBox`** (selector `app-search-box`): an `<input #field aria-label="Search">` and a `Focus search` button that focuses the input using `viewChild()`.

**`App`** (selector `app-root`), already written in the starter, projects `Profile` and `Settings` tabs plus an `Extra` tab shown after clicking `Add tab`, and renders a search box.
