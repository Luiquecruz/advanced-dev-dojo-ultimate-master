1. Declare `Todo` and the `Action` union, each member with a literal `type`.
2. Annotate the reducer parameters and return type; implement each case immutably. Compute the next id from the highest existing id.
3. Add the `never` assignment in `default` so future action types cannot be forgotten.
4. In the component, let `useReducer` infer its types from the reducer, and type the ref with `useRef<HTMLInputElement>(null)`.
5. Replace `any` in the handlers with `ChangeEvent<HTMLInputElement>` and `SubmitEvent<HTMLFormElement>`.
6. On submit: prevent the default, ignore empty titles, dispatch, clear and focus with optional chaining.
7. Render the list with labelled checkboxes and the `Clear completed` button.
