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
  // TODO: add an `isCardValid` guard: the card must be exactly 16 digits
}).createMachine({
  id: 'payment',
  initial: 'editing',
  context: { card: '', receiptId: null, error: null },
  states: {
    editing: {
      on: {
        'card.change': { actions: assign({ card: ({ event }) => event.value }) },
        // TODO: `submit` goes to `submitting`, guarded by 'isCardValid'
      },
    },
    // TODO: `submitting`: clear `error` on entry and invoke 'chargeCard' with input { card }
    //       onDone -> `success` storing event.output.receiptId, onError -> `failure` storing event.error.message
    // TODO: `failure`: `retry` -> submitting, `edit` -> editing
    // TODO: `success`: final state
  },
});

export function Checkout({ machine = paymentMachine }) {
  const [snapshot, send] = useMachine(machine);

  // TODO: in `success`, render only <p role="status">Paid! Receipt {receiptId}</p>

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
          onChange={(event) => send({ type: 'card.change', value: event.target.value })}
        />
      </label>
      {/* TODO: disable the button when snapshot.can({ type: 'submit' }) is false and show "Processing..." while submitting */}
      <button type="submit">Pay</button>
      {/* TODO: in `failure`, render a role="alert" box with the error, a "Retry" and an "Edit card" button */}
    </form>
  );
}

export default function App() {
  return <Checkout />;
}
