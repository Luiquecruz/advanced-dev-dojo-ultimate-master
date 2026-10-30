import { assign, fromPromise, setup } from 'xstate';
import { useMachine } from '@xstate/react';
import { placeOrder } from '../api/placeOrder';
import { INITIAL_CHECKOUT_DATA } from '../checkout/contract';

export const checkoutMachine = setup({
  actors: {
    placeOrder: fromPromise(({ input }) => placeOrder(input)),
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
    shipping: {
      on: {
        next: { target: 'payment', actions: 'mergeFields' },
        back: 'cart',
      },
    },
    payment: {
      on: {
        submit: { target: 'submitting', actions: 'mergeFields' },
        back: 'shipping',
      },
    },
    submitting: {
      entry: 'clearError',
      invoke: {
        src: 'placeOrder',
        input: ({ context }) => context.data,
        onDone: { target: 'done', actions: assign({ order: ({ event }) => event.output }) },
        onError: { target: 'error', actions: assign({ error: ({ event }) => event.error.message }) },
      },
    },
    error: {
      on: {
        retry: 'submitting',
        back: { target: 'payment', actions: 'clearError' },
      },
    },
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
