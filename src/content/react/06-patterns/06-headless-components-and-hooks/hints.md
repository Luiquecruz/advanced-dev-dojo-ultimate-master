Start with state and ids: `const [isOpen, setIsOpen] = useState(defaultOpen);` and `const panelId = useId();`. `toggle` uses the updater form.
---
A prop getter is just a function returning an object. Spread the user props first, then add yours: `({ ...props, type: 'button', 'aria-expanded': isOpen, 'aria-controls': panelId, onClick })`.
---
Compose the handler instead of replacing it: `onClick: (event) => { props.onClick?.(event); toggle(); }`. The panel getter returns `{ ...props, id: panelId, hidden: !isOpen }`. In `FaqItem`, spread them: `<button {...getButtonProps()}>` and `<p {...getPanelProps()}>`.
