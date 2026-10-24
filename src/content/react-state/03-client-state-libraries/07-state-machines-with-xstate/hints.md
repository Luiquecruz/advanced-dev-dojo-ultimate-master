Start with the guard: `setup({ actors: { chargeCard }, guards: { isCardValid: ({ context }) => /^\d{16}$/.test(context.card) } })`, then `submit: { guard: 'isCardValid', target: 'submitting' }` in `editing`.
---
An invoked actor lives in the state that declares it: `submitting: { entry: assign({ error: null }), invoke: { src: 'chargeCard', input: ({ context }) => ({ card: context.card }), onDone: {...}, onError: {...} } }`. In v5 the result is `event.output` and the failure is `event.error`.
---
In the component, `snapshot.matches('success')` / `'submitting'` / `'failure'` pick what to render, and `disabled={!snapshot.can({ type: 'submit' })}` reuses the guard, so the button logic never duplicates the validation.
