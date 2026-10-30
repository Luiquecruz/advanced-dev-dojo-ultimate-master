import { createContext, useContext } from 'react';

const PlaceOrderContext = createContext(null);

export function PlaceOrderProvider({ placeOrder, children }) {
  return <PlaceOrderContext.Provider value={placeOrder}>{children}</PlaceOrderContext.Provider>;
}

export function usePlaceOrder() {
  const placeOrder = useContext(PlaceOrderContext);
  if (!placeOrder) {
    throw new Error('usePlaceOrder must be used inside <PlaceOrderProvider>');
  }
  return placeOrder;
}
