1. Remove the state from `Panel` and accept `isActive` and `onShow` as props; the markup stays the same.
2. Add `activeIndex` state to `Accordion`, the closest common parent of both panels, starting at `0`.
3. Derive each panel's `isActive` from the index (`activeIndex === 0`, `activeIndex === 1`).
4. Pass a callback that sets the index, so a panel asks its parent to open it instead of opening itself.
