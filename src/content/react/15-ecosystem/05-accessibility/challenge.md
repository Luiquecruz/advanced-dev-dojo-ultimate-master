The `Tabs` component works only with a mouse. Rebuild it following the **ARIA Authoring Practices tabs pattern**. `Tabs` is a **named export** receiving `label` and `tabs` (an array of `{ id, label, content }`).

- The tab container has `role="tablist"` and its accessible name is `label` (`aria-label`).
- Each tab is a `<button type="button" role="tab">` showing `tab.label`, with:
  - `aria-selected="true"` on the selected tab and `"false"` on the others (the first tab starts selected);
  - a unique `id` and `aria-controls` pointing to the panel's id;
  - a **roving tabIndex**: `0` on the selected tab, `-1` on the others.
- Render one panel for the selected tab with `role="tabpanel"`, a unique `id`, `aria-labelledby` pointing to its tab, `tabIndex={0}`, and the tab's `content`.
- Clicking a tab selects it.
- With focus on a tab: `ArrowRight` and `ArrowLeft` select **and focus** the next or previous tab, wrapping around at both ends; `Home` and `End` jump to the first and last tab.
