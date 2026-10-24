1. Implement the form action: read the `email` field from `FormData`, await `onSubscribe`, then set `done`.
2. Render `<SendingHint />` and `<SubmitButton />` inside the `<form>` so they can see its status.
3. In `SubmitButton`, read `pending` from `useFormStatus()` and use it for `disabled` and the label.
4. In `SendingHint`, read `pending` and `data`; render the hint only while pending, using `data.get('email')`.
