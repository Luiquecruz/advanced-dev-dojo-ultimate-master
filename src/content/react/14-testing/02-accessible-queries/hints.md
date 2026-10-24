Run the tests and read the failure messages: when `getByRole` fails, it lists every role and name it can see. Notice that the `div` "button" and the title are missing from that list.
---
Swap tags for semantic ones: the title becomes `<h1>`, the clickable `div` becomes `<button type="submit">` (remove its `onClick`, the form's `onSubmit` handles it). Add `alt="Dojo logo"` to the image.
---
Label the fields: `<label htmlFor={emailId}>Email</label><input id={emailId} ... />` (create ids with `useId()`), and wrap the checkbox and its text in one `<label>`. Finally add `role="alert"` to the error paragraph.
