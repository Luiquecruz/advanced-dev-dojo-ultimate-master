## Booleans create impossible states

A checkout flow written with independent flags looks harmless:

```jsx
const [step, setStep] = useState(1);
const [isSubmitting, setIsSubmitting] = useState(false);
const [isError, setIsError] = useState(false);
const [isDone, setIsDone] = useState(false);
```

Four booleans and a number allow dozens of combinations, and most are nonsense: `isSubmitting && isDone`, `isError` on step 1, a second submit while the first is in flight. Every handler has to remember to reset the right flags, and every bug is a forgotten `setX(false)`.

## Model status as one finite value

Replace the flags with a single `status` that can only hold the states the flow really has:

```ts
type Status = 'shipping' | 'payment' | 'review' | 'submitting' | 'done' | 'failed';
```

Now "submitting and done at the same time" cannot be represented. The UI becomes a switch over `status`, and each screen only reads the fields that exist in that state.

## Actions are events, the reducer decides

A reducer is a pure function `(state, action) => nextState`. Name actions after **what happened** (`paymentSubmitted`, `orderFailed`), not after the setter you want (`setStep`). The reducer, not the component, decides what an event means in the current state. That is the difference between a reducer and a bag of setters.

Actions form a **discriminated union**: the `type` field tells you which payload exists.

```ts
type CheckoutAction =
  | { type: 'shippingSubmitted'; address: string }
  | { type: 'paymentSubmitted'; card: string }
  | { type: 'orderPlaced' }
  | { type: 'orderSucceeded'; orderId: string }
  | { type: 'orderFailed'; error: string };
```

In TypeScript, `switch (action.type)` narrows the payload in each branch, and a `never` check in `default` makes forgetting a case a compile error.

## Explicit transitions

The most robust shape is a **transition table**: for each status, the events it accepts. Anything else is ignored by returning the **same state object**, which makes React bail out of the render.

```js
const transitions = {
  review: {
    back: (state) => ({ ...state, status: 'payment' }),
    orderPlaced: (state) => ({ ...state, status: 'submitting', error: null }),
  },
  submitting: {
    orderSucceeded: (state, action) => ({ ...state, status: 'done', orderId: action.orderId }),
    orderFailed: (state, action) => ({ ...state, status: 'failed', error: action.error }),
  },
};

export function checkoutReducer(state, action) {
  const transition = transitions[state.status]?.[action.type];
  return transition ? transition(state, action) : state;
}
```

A double click on "Place order" now dispatches `orderPlaced` while already `submitting`: there is no such transition, so nothing happens. The guard lives in one place instead of in every button.

Distinguish two kinds of "invalid": an event that is **known but not allowed now** (ignore it) and a **typo or unknown type** (throw, so it fails loudly in development).

## Side effects stay outside

Reducers must be pure: no fetches, no timers, no `Date.now()`, no mutation. Async work happens in the event handler, which dispatches events around the `await`:

```jsx
async function handlePlaceOrder() {
  dispatch({ type: 'orderPlaced' });
  try {
    const { orderId } = await placeOrder({ address: state.address, card: state.card });
    dispatch({ type: 'orderSucceeded', orderId });
  } catch (error) {
    dispatch({ type: 'orderFailed', error: error.message });
  }
}
```

Because the reducer is a plain function, you can test every transition without rendering anything: `expect(checkoutReducer(review, { type: 'orderPlaced' }).status).toBe('submitting')`.

## From reducer to state machine

A transition table is a small **state machine**. When flows grow nested states, parallel regions, delayed transitions or invoked services, a dedicated library (XState, covered later in this track) adds visualization and guarantees. For most screens, a reducer with a `status` field is enough.

## When to use it / when not to

Use `useReducer` with a finite `status` when state has several fields that change together, when the next state depends on the current phase (wizards, checkout, uploads, async requests, multi-step dialogs), or when you want to unit test the logic. Keep `useState` for independent values (a toggle, a text field). Do not turn every component into a reducer: a reducer that only contains `setX` actions adds ceremony without adding rules. Reach for XState when the table itself becomes hard to read.
