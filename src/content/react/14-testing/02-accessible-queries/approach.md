1. Replace the title `div` with an `<h1>` so it gets the `heading` role with level 1.
2. Add `alt="Dojo logo"` so the image gets an accessible name.
3. Give each text field a `<label>` connected by `htmlFor`/`id` (use `useId()` to generate ids). Placeholders can stay, but they are not labels.
4. Wrap the checkbox and the "Remember me" text in a single `<label>` (implicit association).
5. Replace the clickable `div` with `<button type="submit">` and drop its `onClick`: native buttons are focusable, respond to Enter and Space, and submit the form.
6. Add `role="alert"` to the error message so it is announced when it appears.
