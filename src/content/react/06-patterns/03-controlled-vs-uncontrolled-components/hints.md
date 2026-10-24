For the form, add `defaultValue={defaultEmail}` to the input. In `handleSubmit`, call `event.preventDefault()`, then `new FormData(event.currentTarget).get('email')`, and finally `event.currentTarget.reset()`.
---
In `Stepper`, compute `const isControlled = value !== undefined;` and `const current = isControlled ? value : internalValue;`. Use `!== undefined`, because `0` is a valid controlled value.
---
In `update`, only call `setInternalValue(next)` when `!isControlled`, then always call `onChange?.(next)`. In `App`, `const [quantity, setQuantity] = useState(1)` and render `<Stepper value={quantity} onChange={setQuantity} />`.
