1. Store `isOpen` with `useState(defaultOpen)` and implement `open`, `close` and `toggle`.
2. Generate a stable, unique panel id with `useId`.
3. Write `getButtonProps`: spread user props, then set `type`, `aria-expanded`, `aria-controls` and a composed `onClick`.
4. Write `getPanelProps`: spread user props, then set `id` and `hidden`.
5. Return everything from the hook.
6. In `FaqItem`, call the hook and spread each getter on its element. Any other skin (accordion, sidebar section, "show more") can reuse the same hook.
