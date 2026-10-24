1. Render the children inside `<Fragment ref={fragmentRef}>` so no wrapper node is created.
2. In an effect keyed on `onPress`, create one listener function and register it with the FragmentInstance's `addEventListener`.
3. Return a cleanup that removes exactly that listener, so updates swap listeners instead of stacking them.
4. In a second effect, call `focus()` on the FragmentInstance when `autoFocus` is true; it focuses the first focusable child.
