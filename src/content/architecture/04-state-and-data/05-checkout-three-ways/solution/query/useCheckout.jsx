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
  const orderMutation = useMutation({
    mutationFn: placeOrder,
    onSettled: () => {
      requestInFlight.current = false;
    },
  });

  const step = orderMutation.isPending
    ? 'submitting'
    : orderMutation.isError
      ? 'error'
      : orderMutation.isSuccess
        ? 'done'
        : formStep;

  function sendOrder(order) {
    requestInFlight.current = true;
    orderMutation.mutate(order);
  }

  function next(fields) {
    if (requestInFlight.current || !NEXT_STEPS[step]) {
      return;
    }
    setData({ ...data, ...fields });
    setFormStep(NEXT_STEPS[step]);
  }

  function back() {
    if (requestInFlight.current) {
      return;
    }
    if (step === 'error') {
      orderMutation.reset();
      return;
    }
    if (PREVIOUS_STEPS[step]) {
      setFormStep(PREVIOUS_STEPS[step]);
    }
  }

  function submit(fields) {
    if (requestInFlight.current || step !== 'payment') {
      return;
    }
    const order = { ...data, ...fields };
    setData(order);
    sendOrder(order);
  }

  function retry() {
    if (requestInFlight.current || step !== 'error') {
      return;
    }
    sendOrder(data);
  }

  const checkout = {
    step,
    data,
    error: orderMutation.error ? orderMutation.error.message : null,
    order: orderMutation.data ?? null,
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
