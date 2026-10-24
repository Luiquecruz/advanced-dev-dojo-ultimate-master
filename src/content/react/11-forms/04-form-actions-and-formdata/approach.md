1. Write the action as a pure "previous state + form data in, next state out" function. Read the title from `FormData` and normalize it.
2. Validate first and return an error state that includes the submitted title, so nothing is lost after React resets the form.
3. When valid, call the API and build the success state from the server response; return an empty title so the reset leaves the input blank.
4. Connect the action with `useActionState`, which gives you the latest state, the wrapped action and the pending flag.
5. Pass the wrapped action to `<form action>`; React handles `preventDefault`, `FormData` creation, the transition and the reset.
6. Drive the button from `isPending` and render the message with the role matching its status.
