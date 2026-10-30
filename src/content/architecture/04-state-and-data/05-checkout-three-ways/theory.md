## One flow, three architectures

A checkout is the textbook process state: `cart → shipping → payment → submitting → done`, with `error` and retry on the side. The interesting part is not the happy path but the **rules**: you cannot pay from the cart, you cannot go back while the order is being placed, a double click must not charge twice, a failure must keep what the user typed.

This lesson builds the same flow three ways and keeps them interchangeable behind one contract:

```js
const { step, data, error, order, next, back, submit, retry } = useCheckout();
```

The view (`CheckoutView`) only knows this shape, and one test suite runs against all three implementations. That is the first lesson: **put a contract between the flow and the UI**, and the tool behind it becomes a replaceable detail.

## Version 1: `useReducer` with a discriminated status

```js
function checkoutReducer(state, action) {
  switch (action.type) {
    case 'submit':
      return state.step === 'payment' ? { ...state, step: 'submitting' } : state;
    ...
  }
}
```

One `step` field replaces a pile of booleans (`isLoading`, `isError`, `isDone`), so states like "loading and failed" cannot be represented. Each case checks the current step, so the reducer ignores impossible transitions. It is plain React, and the reducer is a pure function you can test without rendering.

The weak spot is **side effects**. The request does not fit in a pure reducer, so it lives in the event handler, and the handler reads `state` from the last render. Two calls in the same tick (a click handler and a form `onSubmit` both firing, a double-fired event) both see `'payment'`, and both would send the order. The fix is a second guard (a ref) that the reducer knows nothing about. Every async rule you add (timeouts, cancellation, retries with backoff) grows this hand-written layer.

## Version 2: TanStack Query + Context

This version splits the state **by owner**, the classification from the first lesson of the module:

- The wizard position and the collected data are **client state**, shared through a Context provider.
- The request lifecycle (pending, error, result) is **server interaction**, owned by `useMutation`.

The visible step is **derived**: `isPending ? 'submitting' : isError ? 'error' : isSuccess ? 'done' : formStep`. You get the request status, configurable retries, `onSuccess` hooks for invalidating related queries (the orders list, the cart) and devtools for free.

The price is that the flow is now spread over two sources that update at different times. The mutation status reaches React after a render, so the double-submit guard is still a ref, and every transition needs to know whether a request is in flight. Nothing in the code shows the flow as a whole; you reconstruct it from conditions in several functions.

## Version 3: an XState machine

```js
payment: {
  on: { submit: { target: 'submitting', actions: 'mergeFields' }, back: 'shipping' },
},
submitting: {
  invoke: { src: 'placeOrder', input: ({ context }) => context.data, onDone: 'done', onError: 'error' },
},
```

The machine **is** the transition table. An event without a transition in the current state is ignored, so `submit` from `cart`, a second `submit` while `submitting` and `back` during the request need no code at all. The request is an actor **invoked by the state**: entering `submitting` starts it, leaving the state stops it, and its result can only arrive as `onDone`/`onError` of that state. The definition can be visualized, shared with product and QA, and tested without React (`createActor(checkoutMachine).start()`), with `provide()` swapping the actor for a fake.

The costs: a library and a vocabulary the whole team must learn (states, events, actions, actors, guards), more ceremony for a three-field form, and a context object that tends to grow if every piece of data goes in.

## Comparing them

| | `useReducer` | Query + Context | XState |
| --- | --- | --- | --- |
| Dependencies | none | TanStack Query | XState |
| Impossible states | prevented by the `step` union | derived from two sources | prevented by construction |
| Impossible transitions | guard per case | guard per function | ignored by default |
| Double submit | manual ref | manual ref | no extra code |
| Async lifecycle | hand-written | mutation status, retries, callbacks | invoked actors, cancellation on exit |
| Testing | pure reducer + hook | hook with a QueryClient | machine without React, `provide()` |
| Seeing the flow | read every case | read every function | the definition (and a diagram) |

None of them is "the best". When the reducer starts collecting refs, timers and flags, the same tests prove that a machine version behaves identically.

## When to choose it

Start with `useReducer` and a `step` union for short flows owned by one component with one async call. Add TanStack Query when the flow mainly coordinates server interactions that other screens care about (invalidations, optimistic updates, retries), keeping the step in a small provider. Move to a state machine when the flow has many states, guarded or timed transitions, parallel parts, or cancellations, or when product and QA need to review the flow itself. Whatever you choose, keep a `useCheckout()` contract between the flow and the UI so you can change your mind later.
