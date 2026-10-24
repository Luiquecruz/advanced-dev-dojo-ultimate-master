Start with the static markup: `role="tablist"` with `aria-label={label}`, `<button role="tab">` for each tab and `role="tabpanel"` for the content. Generate ids with `const baseId = useId()` and build `${baseId}-tab-${tab.id}` / `${baseId}-panel-${tab.id}`.
---
Roving tabIndex is one expression: `tabIndex={index === selected ? 0 : -1}`. Do the same for `aria-selected={index === selected}`.
---
Put one `onKeyDown` on the tablist. Compute the next index for each key (`(selected + 1) % tabs.length` wraps forward), call `event.preventDefault()`, update `selected` and move focus.
---
To move focus, store each button in a ref array: `ref={(element) => { tabRefs.current[index] = element; }}`, then call `tabRefs.current[next].focus()` in the key handler.
