Only Transitions animate. Put the state update inside `startTransition(() => { ... })`.
---
Call `addTransitionType(direction)` as the first line inside the `startTransition` callback, then `setIndex((current) => (current + step + slides.length) % slides.length)` where `step` is `1` or `-1`.
---
Changing the `key` of `<ViewTransition key={index} enter={{ ... }} exit={{ ... }}>` makes the old slide exit and the new one enter, using the classes mapped to the current type.
