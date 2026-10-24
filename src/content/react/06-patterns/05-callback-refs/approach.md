1. In `AutoFocusInput`, pass a function to `ref` that focuses the node. Optional chaining keeps it safe if React ever calls it with `null`.
2. In `ContactList`, add a callback ref to each `<li>` that stores the node in `registry` under the contact id.
3. Return a cleanup from that callback that deletes the id, so React 19 removes entries on detach instead of calling the ref with `null`.
4. In `App`, keep `showSearch` in state, render the labelled checkbox and mount `AutoFocusInput` conditionally. The callback ref focuses the input the moment it appears.
