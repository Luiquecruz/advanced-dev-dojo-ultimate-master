1. For each function, write down its identity contract: mutate the argument, return a new object, or return the same object.
2. `add_item`: replace the rebinding line with an in-place operation (`append`) and return the parameter itself.
3. `snapshot`: return a shallow copy so later appends to the cart are not visible.
4. `merge_carts`: construct the result without using an in-place operator on either input.
5. `empty_carts`: create the inner list once per position, never by repeating one reference.
6. Check each function mentally with two names for the same list and ask who sees the change.
