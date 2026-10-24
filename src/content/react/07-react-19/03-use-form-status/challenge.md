Build a newsletter form whose button and hint read the form status with `useFormStatus`.

1. Export `SubmitButton`: a `<button type="submit">` that uses `useFormStatus()` from `react-dom`.
   - Idle: text `Subscribe`, enabled.
   - Pending: text `Subscribing...`, **disabled**.
2. Export `SendingHint`: uses `useFormStatus()`; while pending it renders `<p role="status">Sending to {email}</p>` with the email being submitted (`data.get('email')`), otherwise renders nothing.
3. The default export `NewsletterForm({ onSubscribe })`:
   - Renders a `<form>` whose `action` is an async function that awaits `onSubscribe(email)` with the submitted `email` field, then shows the thank-you message.
   - Inside the form: a `<label>` with text `Email` wrapping `<input name="email" type="email" />`, then `<SendingHint />` and `<SubmitButton />`.
   - After `onSubscribe` resolves, render only `<p>Thanks for subscribing!</p>` instead of the form.
