1. Swap `ref` for `shallowRef` so the array and its items stay plain objects.
2. Implement `addPoint` as an immutable update that assigns a new array to `.value`.
3. Implement `movePoint` as an in-place mutation followed by `triggerRef(points)`.
4. Wrap the engine with `markRaw` before it enters the reactive object.
5. Unwrap `settings` with `toRaw` before passing it to `structuredClone`.
