import { createOrder } from '../domain/order';

export function createPlaceOrder(orderGateway) {
  return async function placeOrder(items) {
    const order = createOrder(items);
    const { id } = await orderGateway.save(order);
    return { ...order, id };
  };
}
