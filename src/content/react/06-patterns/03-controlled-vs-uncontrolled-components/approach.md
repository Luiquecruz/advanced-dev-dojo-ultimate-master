1. Make the email input uncontrolled with `defaultValue`; the DOM now owns the text.
2. On submit, prevent navigation, read the field through `FormData` by its `name`, notify the parent and reset the form.
3. In `Stepper`, derive the mode from `value !== undefined` and pick the current value from props or internal state.
4. Route every change through `update`: internal state only when uncontrolled, `onChange` always.
5. In `App`, lift the quantity into state and pass `value` and `onChange`, which makes the stepper controlled, so the parent's `Reset` button can change it.
