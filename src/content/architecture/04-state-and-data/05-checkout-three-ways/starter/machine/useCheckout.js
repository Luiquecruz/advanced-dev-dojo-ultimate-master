import { assign, fromPromise, setup } from 'xstate';
import { useMachine } from '@xstate/react';
import { placeOrder } from '../api/placeOrder';
import { INITIAL_CHECKOUT_DATA } from '../checkout/contract';

export const checkoutMachine = setup({
  actors: {
    // TODO: register placeOrder as a promise actor: fromPromise(({ input }) => placeOrder(input))
  },
  actions: {
    mergeFields: assign({ data: ({ context, event }) => ({ ...context.data, ...event.fields }) }),
    clearError: assign({ error: null }),
  },
}).createMachine({
  id: 'checkout',
  initial: 'cart',
  context: { data: INITIAL_CHECKOUT_DATA, error: null, order: null },
  states: {
    cart: {
      on: { next: { target: 'shipping', actions: 'mergeFields' } },
    },
    // TODO: shipping: next → payment (mergeFields), back → cart
    shipping: {},
    // TODO: payment: submit → submitting (mergeFields), back → shipping
    payment: {},
    // TODO: submitting: clearError on entry, invoke 'placeOrder' with context.data as input,
    // onDone → done storing event.output as order, onError → error storing event.error.message
    submitting: {},
    // TODO: error: retry → submitting, back → payment (clearError)
    error: {},
    done: { type: 'final' },
  },
});

export function useCheckout() {
  const [snapshot, send] = useMachine(checkoutMachine);

  return {
    step: snapshot.value,
    data: snapshot.context.data,
    error: snapshot.context.error,
    order: snapshot.context.order,
    next: (fields) => send({ type: 'next', fields }),
    back: () => send({ type: 'back' }),
    submit: (fields) => send({ type: 'submit', fields }),
    retry: () => send({ type: 'retry' }),
  };
}
