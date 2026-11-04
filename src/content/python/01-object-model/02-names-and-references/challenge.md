The cart module below has four aliasing bugs. Repair `main.py` so each function honors its identity contract.

## Functions

- `add_item(cart, item)`: **mutates** `cart` by appending `item` and **returns that same list object**. The caller's list must contain the item afterwards.
- `snapshot(cart)`: returns a **new** list with the same items. Changing the cart later must not change the snapshot.
- `merge_carts(first, second)`: returns a **new** list with the items of `first` followed by the items of `second`. Neither input is modified, and the result is neither of the inputs.
- `empty_carts(count)`: returns a list of `count` **independent** empty lists.

## Rules

- Use list operations only; no imports are needed.
- Keep the function names and parameters.

Run the demo to see what the module does with your functions.
