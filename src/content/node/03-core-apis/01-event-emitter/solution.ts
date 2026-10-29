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
    if (amount <= 0) {
      this.emit('error', new Error(`Invalid amount for ${orderId}`));
      return;
    }
    this.emit('paid', { orderId, amount });
  }
}

export function onPaid(checkout: Checkout, listener: (payment: Payment) => void): () => void {
  checkout.on('paid', listener);
  return () => {
    checkout.off('paid', listener);
  };
}

export async function nextPayment(checkout: Checkout): Promise<Payment> {
  const [payment] = await once(checkout, 'paid');
  return payment as Payment;
}

export function attachErrorLogger(checkout: Checkout): void {
  checkout.on('error', (error) => console.error(`Payment failed: ${error.message}`));
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
