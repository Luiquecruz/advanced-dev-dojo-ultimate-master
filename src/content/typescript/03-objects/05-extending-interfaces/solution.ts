interface Payment {
  id: string;
  amountInCents: number;
  currency: string;
}

interface Timestamped {
  createdAt: Date;
}

interface CardPayment extends Payment, Timestamped {
  cardLastFourDigits: string;
}

function formatCardPayment(payment: CardPayment): string {
  const amount = (payment.amountInCents / 100).toFixed(2);
  const date = payment.createdAt.toISOString().slice(0, 10);
  return `Card ending ${payment.cardLastFourDigits} charged ${amount} ${payment.currency} on ${date}`;
}
