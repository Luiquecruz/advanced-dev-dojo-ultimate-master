import { useReducer, useRef } from 'react';
import { placeOrder } from '../api/placeOrder';
import { INITIAL_CHECKOUT_DATA } from '../checkout/contract';

const NEXT_STEPS = { cart: 'shipping', shipping: 'payment' };
const PREVIOUS_STEPS = { shipping: 'cart', payment: 'shipping', error: 'payment' };

const initialCheckoutState = { step: 'cart', data: INITIAL_CHECKOUT_DATA, error: null, order: null };

function checkoutReducer(state, action) {
  switch (action.type) {
    case 'next':
      return NEXT_STEPS[state.step]
        ? { ...state, step: NEXT_STEPS[state.step], data: { ...state.data, ...action.fields } }
        : state;
    case 'back':
      return PREVIOUS_STEPS[state.step] ? { ...state, step: PREVIOUS_STEPS[state.step], error: null } : state;
    case 'submit':
      return state.step === 'payment'
        ? { ...state, step: 'submitting', data: { ...state.data, ...action.fields }, error: null }
        : state;
    case 'retry':
      return state.step === 'error' ? { ...state, step: 'submitting', error: null } : state;
    case 'succeeded':
      return state.step === 'submitting' ? { ...state, step: 'done', order: action.order } : state;
    case 'failed':
      return state.step === 'submitting' ? { ...state, step: 'error', error: action.message } : state;
    default:
      return state;
  }
}

export function useCheckout() {
  const [state, dispatch] = useReducer(checkoutReducer, initialCheckoutState);
  const requestInFlight = useRef(false);

  async function sendOrder(order) {
    requestInFlight.current = true;
    try {
      dispatch({ type: 'succeeded', order: await placeOrder(order) });
    } catch (error) {
      dispatch({ type: 'failed', message: error.message });
    } finally {
      requestInFlight.current = false;
    }
  }

  function submit(fields) {
    if (state.step !== 'payment' || requestInFlight.current) {
      return;
    }
    dispatch({ type: 'submit', fields });
    sendOrder({ ...state.data, ...fields });
  }

  function retry() {
    if (state.step !== 'error' || requestInFlight.current) {
      return;
    }
    dispatch({ type: 'retry' });
    sendOrder(state.data);
  }

  return {
    ...state,
    next: (fields) => dispatch({ type: 'next', fields }),
    back: () => dispatch({ type: 'back' }),
    submit,
    retry,
  };
}
