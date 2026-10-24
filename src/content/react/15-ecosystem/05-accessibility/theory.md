## Accessibility is part of correctness

Around one in six people lives with a disability. They use screen readers, keyboards, switch devices, voice control, zoom and high contrast. An inaccessible component is a broken component for them, and in many places it is also a legal problem (ADA in the US, the European Accessibility Act in force since June 2025). The reference standard is **WCAG 2.2**, level **AA**.

## 1. Semantic HTML first

Native elements come with roles, keyboard support and focus behavior for free:

```jsx
// Bad: no role, not focusable, ignores Enter and Space
<div className="btn" onClick={save}>Save</div>

// Good
<button type="button" onClick={save}>Save</button>
```

Use `<button>` for actions and `<a href>` for navigation, headings in order (`h1` then `h2`), lists for lists, `<nav>`, `<main>`, `<header>`, `<footer>` landmarks, `<label>` for every input, `alt` on informative images (`alt=""` on decorative ones). Native `<dialog>` with `showModal()` traps focus and handles Escape; `<details>`/`<summary>` is a free disclosure widget.

## 2. ARIA when HTML is not enough

ARIA adds **semantics only**; it never adds behavior. The first rule of ARIA: do not use it when a native element does the job. When you build a custom widget (tabs, combobox, tree, menu), follow the **ARIA Authoring Practices Guide (APG)** pattern exactly: roles, states and keyboard model.

```jsx
<button aria-expanded={open} aria-controls={panelId}>Filters</button>
<div id={panelId} hidden={!open}>...</div>
```

In JSX, `aria-*` and `data-*` attributes keep their hyphenated names. `useId()` generates unique ids for `aria-controls`, `aria-labelledby` and `aria-describedby`, safe with SSR and multiple instances.

## 3. Keyboard and focus

- Everything interactive must be reachable with **Tab** and operable with Enter/Space (and arrows for composite widgets).
- Never remove focus outlines without a replacement: style `:focus-visible`.
- `tabIndex={0}` adds an element to the Tab order, `tabIndex={-1}` makes it focusable only by script. Avoid positive values.
- **Roving tabindex**: in composite widgets (tabs, toolbars, menus, grids) only one item has `tabIndex={0}`. Tab enters and leaves the widget in one stop; arrow keys move between items.

```jsx
<button role="tab" aria-selected={active} tabIndex={active ? 0 : -1} />
```

## 4. Manage focus when the UI changes

React re-renders silently; screen readers and keyboard users need you to move focus deliberately:

- Opening a dialog: focus moves inside; closing returns it to the trigger. Make the background `inert`.
- Client-side route change: move focus to the new page's `<h1>` (or announce the title), because the browser no longer does it.
- Deleting an item: move focus to a sensible neighbor, not to `<body>`.

Use refs and call `element.focus()` in event handlers or Effects.

## 5. Announce dynamic content

Live regions read updates aloud without moving focus: `role="status"` (polite: "3 results") and `role="alert"` (assertive: errors). The region should exist in the DOM before its content changes.

## 6. Perceivable design

- Text contrast at least **4.5:1** (3:1 for large text and UI component boundaries).
- Do not convey meaning by color alone; add text or icons.
- Support zoom to 200% and reflow at 320 px width. Use relative units.
- Respect `prefers-reduced-motion`.
- Target size at least 24 by 24 CSS pixels (WCAG 2.2).

## Tooling

- `eslint-plugin-jsx-a11y` catches missing `alt`, click handlers on divs, invalid ARIA.
- Testing Library queries by role and name (previous module): if the test cannot find it, assistive tech may not either.
- **axe-core** (`@axe-core/react`, `vitest-axe`, Playwright `@axe-core/playwright`) runs automated checks, which catch roughly a third of issues.
- Manual testing remains essential: unplug the mouse, try VoiceOver (macOS/iOS), NVDA (Windows) or TalkBack (Android).

## Pitfalls

- `aria-label` on a `<div>` without a role: ignored by most screen readers.
- `role="button"` on a div without `tabIndex` and key handlers: looks accessible to linters, is not.
- Hiding content with `display: none` when it should only be visually hidden: use a `.sr-only` class for screen-reader-only text.
- Placeholder text instead of labels, and icon-only buttons without an accessible name.
