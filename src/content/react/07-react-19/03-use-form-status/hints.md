`useFormStatus()` only works in components rendered **inside** the `<form>`. That's why `SubmitButton` and `SendingHint` are separate components.
---
In `SubmitButton`: `const { pending } = useFormStatus();` then `disabled={pending}` and `{pending ? 'Subscribing...' : 'Subscribe'}`.
---
In `SendingHint`: `const { pending, data } = useFormStatus();` return `null` when not pending, otherwise `data.get('email')`. In the form action: `await onSubscribe(formData.get('email')); setDone(true);`.
