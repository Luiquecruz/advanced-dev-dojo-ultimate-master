import { createContext, useContext, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { placeOrder } from '../api/placeOrder';
import { INITIAL_CHECKOUT_DATA } from '../checkout/contract';

const NEXT_STEPS = { cart: 'shipping', shipping: 'payment' };
const PREVIOUS_STEPS = { shipping: 'cart', payment: 'shipping' };

const CheckoutContext = createContext(null);

export function CheckoutProvider({ children }) {
  const [formStep, setFormStep] = useState('cart');
  const [data, setData] = useState(INITIAL_CHECKOUT_DATA);
  const requestInFlight = useRef(false);

  // TODO: create the order mutation with useMutation({ mutationFn: placeOrder }) and clear requestInFlight in onSettled

  // TODO: derive the visible step: 'submitting' while the mutation is pending, 'error' when it failed,
  // 'done' when it succeeded, otherwise formStep
  const step = formStep;

  function next(fields) {
    // TODO: ignore while a request is in flight or when NEXT_STEPS has no entry for the step;
    // otherwise merge fields into data and move formStep forward
  }

  function back() {
    // TODO: ignore while a request is in flight; from 'error' reset the mutation (formStep is still 'payment'),
    // otherwise move formStep to PREVIOUS_STEPS[step] when there is one
  }

  function submit(fields) {
    // TODO: only from 'payment' and when no request is in flight: merge fields into data,
    // set requestInFlight.current = true and mutate with the merged order
  }

  function retry() {
    // TODO: only from 'error' and when no request is in flight: mutate again with data
  }

  const checkout = {
    step,
    data,
    error: null,
    order: null,
    next,
    back,
    submit,
    retry,
  };

  return <CheckoutContext.Provider value={checkout}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
  return useContext(CheckoutContext);
}
