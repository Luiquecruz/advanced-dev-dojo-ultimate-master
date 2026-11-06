import { assign, fromPromise, setup } from 'xstate';
import { useMachine } from '@xstate/react';

export const chargeCard = fromPromise(async ({ input }) => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  if (input.card.endsWith('0000')) {
    throw new Error('Card declined');
  }
  return { receiptId: `R-${input.card.slice(-4)}` };
});

export const paymentMachine = setup({
  actors: { chargeCard },
  guards: {
    isCardValid: ({ context }) => /^\d{16}$/.test(context.card),
  },
}).createMachine({
  id: 'payment',
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
      entry: assign({ error: null }),
      invoke: {
        src: 'chargeCard',
        input: ({ context }) => ({ card: context.card }),
        onDone: {
          target: 'success',
          actions: assign({ receiptId: ({ event }) => event.output.receiptId }),
        },
        onError: {
          target: 'failure',
          actions: assign({ error: ({ event }) => event.error.message }),
        },
      },
    },
    failure: {
      on: {
        retry: 'submitting',
        edit: 'editing',
      },
    },
    success: { type: 'final' },
  },
});

export function Checkout({ machine = paymentMachine }) {
  const [snapshot, send] = useMachine(machine);

  if (snapshot.matches('success')) {
    return <p role="status">Paid! Receipt {snapshot.context.receiptId}</p>;
  }

  function handleSubmit(event) {
    event.preventDefault();
    send({ type: 'submit' });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Card number
        <input
          value={snapshot.context.card}
          disabled={!snapshot.matches('editing')}
          onChange={(event) => send({ type: 'card.change', value: event.target.value })}
        />
      </label>
      <button type="submit" disabled={!snapshot.can({ type: 'submit' })}>
        {snapshot.matches('submitting') ? 'Processing...' : 'Pay'}
      </button>
      {snapshot.matches('failure') && (
        <div role="alert">
          <p>{snapshot.context.error}</p>
          <button type="button" onClick={() => send({ type: 'retry' })}>
            Retry
          </button>
          <button type="button" onClick={() => send({ type: 'edit' })}>
            Edit card
          </button>
        </div>
      )}
    </form>
  );
}

export default function App() {
  return <Checkout />;
}
