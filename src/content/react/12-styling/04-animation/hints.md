Separate "is it open?" (the prop) from "is it in the DOM?" (state). Start with `const [mounted, setMounted] = useState(open)` and render `null` only when `mounted` is false.
---
Derive the visual state from `open`: `data-state={open ? 'open' : 'closed'}` and the matching class. Add `onAnimationEnd={() => { if (!open) setMounted(false); }}`.
---
Adjust state during render when the prop changes: `if (open && !mounted) setMounted(true);` and, for reduced motion, `if (!open && mounted && reducedMotion) setMounted(false);`.
---
For the hook: `useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)` where `subscribe` adds a `change` listener to `window.matchMedia(query)` and returns a function that removes it.
