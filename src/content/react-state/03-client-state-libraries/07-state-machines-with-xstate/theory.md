## Booleans do not scale

A checkout with `isSubmitting`, `isError` and `isSuccess` has 8 combinations, and most of them are impossible. Every new flag doubles the space, and bugs live in the combinations nobody designed: a "Pay" button that can be clicked twice, an error banner that survives a success. A **finite state machine** removes them by construction: the flow is in exactly **one** named state, and only the events declared for that state do anything.

`useReducer` with a `status` field (covered earlier in this track) is a hand-written machine. XState adds what reducers lack: guards, invoked async work with cancellation, delays, nested and parallel states, and a visual model you can inspect.

## XState v5 with `setup()`

```js
import { assign, fromPromise, setup } from 'xstate';

const chargeCard = fromPromise(async ({ input, signal }) => {
  const response = await fetch('/api/charge', { method: 'POST', body: JSON.stringify(input), signal });
  if (!response.ok) throw new Error('Card declined');
  return response.json();
});

export const paymentMachine = setup({
  actors: { chargeCard },
  guards: { isCardValid: ({ context }) => /^\d{16}$/.test(context.card) },
}).createMachine({
  initial: 'editing',
  context: { card: '', receiptId: null, error: null },
  states: {
    editing: {
      on: {
        'card.change': { actions: assign({ card: ({ event }) => event.value }) },
        submit: { guard: 'isCardValid', target: 'submitting' },
      },
    },
    submitting: {
      invoke: {
        src: 'chargeCard',
        input: ({ context }) => ({ card: context.card }),
        onDone: { target: 'success', actions: assign({ receiptId: ({ event }) => event.output.receiptId }) },
        onError: { target: 'failure', actions: assign({ error: ({ event }) => event.error.message }) },
      },
    },
    failure: { on: { retry: 'submitting', edit: 'editing' } },
    success: { type: 'final' },
  },
});
```

- **States** are the keys of `states`; **events** are objects with a `type`.
- **Context** holds the quantitative data (card, receipt). It changes only through `assign`.
- **Guards** decide whether a transition is taken. Named guards live in `setup`, so they are reusable and replaceable.
- **Invoked actors** run while their state is active. Leaving `submitting` stops the promise actor (its `signal` aborts), so a late response can never land in the wrong state. `onDone` receives `event.output`, `onError` receives `event.error`.
- Other actor kinds: `fromCallback` (subscriptions, timers), `fromObservable`, `fromTransition`, and child machines. `after: { 3000: 'idle' }` declares delayed transitions; `type: 'parallel'` runs regions side by side; `tags` group states (`snapshot.hasTag('busy')`).

## React bindings

```jsx
import { useMachine } from '@xstate/react';

function Checkout() {
  const [snapshot, send] = useMachine(paymentMachine);
  return (
    <button disabled={!snapshot.can({ type: 'submit' })} onClick={() => send({ type: 'submit' })}>
      {snapshot.matches('submitting') ? 'Processing...' : 'Pay'}
    </button>
  );
}
```

- `snapshot.matches('submitting')` checks the state; `snapshot.can(event)` evaluates guards, so the UI's "enabled" logic comes from the machine instead of being duplicated.
- `useMachine` re-renders on every snapshot. For big machines use `useActorRef(machine)` plus `useSelector(actorRef, selector)` so components subscribe to slices.
- `createActorContext(machine)` creates a Provider plus `useSelector` / `useActorRef` hooks to share one actor with a subtree.

## Testing and dependency injection

Machines are plain logic. Run them without React with `createActor(machine).start()`, `actor.send(...)` and `actor.getSnapshot()`. Swap side effects with `machine.provide({ actors: { chargeCard: fromPromise(async () => ({ receiptId: 'R-1' })) } })`, which is why named actors and guards in `setup` matter: inline functions cannot be replaced.

## v4 to v5

| v4 | v5 |
| --- | --- |
| `createMachine(config, { services, guards })` | `setup({ actors, guards, actions }).createMachine(config)` |
| `interpret(machine)` | `createActor(machine)` |
| `cond: 'isValid'` | `guard: 'isValid'` |
| `event.data` in `onDone` | `event.output` |
| `state` from `useMachine` | `snapshot` (`[snapshot, send, actorRef]`) |

For simple event-driven stores without states, the companion `@xstate/store` offers a Zustand-sized API.

## When to use it / when not to

**Use XState** for flows where *order* matters and illegal transitions are real bugs: checkouts and payments, multi-step wizards, media players, upload pipelines with retry and cancel, auth/session lifecycles, collaborative or device protocols. The diagram doubles as documentation that product and QA can read.

**Avoid it** for plain data (a cart's items, a theme, filters): a store or `useState` is simpler. For data fetching use a query library; a machine invoking `fetch` is justified only when the fetch is one step of a larger flow. And if a flow has three states and no guards, a `useReducer` with a `status` union is enough.
