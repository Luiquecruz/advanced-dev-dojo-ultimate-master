import { EventEmitter, once } from 'node:events';

export interface Payment {
  orderId: string;
  amount: number;
}

export interface CheckoutEvents {
  paid: [payment: Payment];
  error: [error: Error];
}

export class Checkout extends EventEmitter<CheckoutEvents> {
  pay(orderId: string, amount: number): void {
    // TODO: emit 'paid' with { orderId, amount }, or 'error' with "Invalid amount for <orderId>" when amount <= 0
  }
}

export function onPaid(checkout: Checkout, listener: (payment: Payment) => void): () => void {
  // TODO: register the listener and return a function that removes it
  return () => {};
}

export async function nextPayment(checkout: Checkout): Promise<Payment> {
  // TODO: await once(checkout, 'paid') and return the payload
  return { orderId: '', amount: 0 };
}

export function attachErrorLogger(checkout: Checkout): void {
  // TODO: log "Payment failed: <message>" with console.error on 'error'
}

function main() {
  const checkout = new Checkout();
  attachErrorLogger(checkout);
  const stop = onPaid(checkout, (payment) => console.log('paid', payment));
  nextPayment(checkout).then((payment) => console.log('next payment was', payment.orderId));
  checkout.pay('A-1', 30);
  checkout.pay('A-2', 0);
  stop();
  checkout.pay('A-3', 12);
}

main();
