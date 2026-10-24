The `Cart` stores **redundant** and **duplicated** state, and both get out of sync. Refactor it.

Current bugs:

- `total` is kept in its own state and is not updated when a quantity decreases.
- `selectedItem` is a copy of an item object, so the details show an old quantity and still show an item after it is removed.

Requirements (the markup in the starter stays the same):

1. Keep only two state variables: `items` and **`selectedId`** (`null` at first). Do **not** keep `total` in state, and do not store the selected object.
2. `<p className="total">` shows `Total: $N`, the sum of `price × quantity`, computed during render.
3. Clicking an item's name button selects it. `<p className="selected">` shows `Selected: <name> × <quantity>` with the **current** quantity, or `Nothing selected`.
4. `Increase <name>` adds 1 to the quantity; `Decrease <name>` subtracts 1 and **removes** the item when it reaches 0. Removing the selected item shows `Nothing selected`.
