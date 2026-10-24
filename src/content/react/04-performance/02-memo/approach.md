1. Identify why `UserList` renders: its parent `Dashboard` re-renders on every click, and React renders children recursively by default.
2. Wrap `UserList` in `memo` so React compares old and new props before calling it.
3. Check each prop for referential stability. `users` and `onRender` come from outside and stay the same. The inline `options` object is new every render, which defeats `memo`.
4. Hoist the constant object to module scope so its reference never changes.
5. Confirm a genuinely new `users` array still triggers a render: `memo` skips work only when props are equal.
