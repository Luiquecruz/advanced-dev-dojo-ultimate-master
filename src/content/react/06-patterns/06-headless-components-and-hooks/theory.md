## Behavior without markup

Every design system needs disclosures, dropdowns, comboboxes, dialogs and tabs. Their **behavior** is hard (state, keyboard support, focus management, ARIA wiring) and almost identical everywhere. Their **look** is different in every product. A **headless** component or hook implements the behavior and leaves 100% of the rendering to you.

```jsx
function FaqItem({ question, answer }) {
  const { getButtonProps, getPanelProps } = useDisclosure();
  return (
    <div className="faq">
      <button {...getButtonProps({ className: 'faq-question' })}>{question}</button>
      <p {...getPanelProps()}>{answer}</p>
    </div>
  );
}
```

Popular headless libraries: **TanStack Table**, **TanStack Form**, **Downshift**, **React Aria** hooks, **Headless UI**, **Radix Primitives** and **Base UI** (unstyled components). shadcn/ui is built on top of Radix: you copy styled wrappers into your codebase, while the headless layer handles the hard parts.

## Prop getters

A hook could return raw values (`isOpen`, `toggle`, `panelId`) and let you wire everything. That is flexible but error-prone: forget `aria-controls` once and screen readers lose the relationship. **Prop getters** return a ready-made props object for each element:

```jsx
const getButtonProps = (props = {}) => ({
  ...props,
  type: 'button',
  'aria-expanded': isOpen,
  'aria-controls': panelId,
  onClick: (event) => {
    props.onClick?.(event);
    toggle();
  },
});
```

Rules of good prop getters:

1. **Accept user props** and spread them first, so callers can add `className`, `data-*` or `style`.
2. **Compose event handlers** instead of overwriting them: call the user's `onClick` and then your own logic. Some libraries skip internal logic when the user calls `event.preventDefault()`.
3. **Own the accessibility attributes** the pattern needs (`aria-expanded`, `aria-controls`, `id`, `role`).
4. Generate ids with **`useId`** so they are unique and stable across server and client rendering.

## Headless hook vs headless component

The same behavior can be exposed as a hook or as compound components:

```jsx
const disclosure = useDisclosure();

<Disclosure>
  <Disclosure.Button>Question</Disclosure.Button>
  <Disclosure.Panel>Answer</Disclosure.Panel>
</Disclosure>
```

Hooks give maximum control (any element, any structure). Components are more convenient and can manage things like portals and focus for you. Many libraries ship both, the components built on the hooks.

## Legacy vs modern

- Before hooks, headless logic was shipped as **render props**: Downshift's `<Downshift>{({ getInputProps, getItemProps }) => ...}</Downshift>` popularized prop getters in 2017.
- **HOCs** like `withDisclosure(Component)` injected props implicitly.
- Today the default is a **custom hook** (`useCombobox` in Downshift v7+), optionally wrapped in unstyled compound components.

## Testing benefits

Headless hooks are pure logic, so you can test them with `renderHook` without rendering any markup, then test each skin separately with role-based queries. The tests in this lesson do exactly that.

## Pitfalls

- Overwriting the user's `onClick` (spreading user props **after** your handler, or ignoring them) silently breaks callers.
- Hard-coded ids (`id="panel"`) collide when the component renders twice on a page.
- Returning new prop getter functions every render is fine; memoize only if consumers are memoized and you measured a problem.
- Headless does not mean "no accessibility work": the hook must implement the WAI-ARIA pattern correctly, or every skin inherits the bug.
