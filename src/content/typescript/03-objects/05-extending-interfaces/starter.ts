interface Payment {
  id: string;
  amountInCents: number;
  currency: string;
}

interface Timestamped {
  createdAt: Date;
}

// TODO: make CardPayment extend Payment and Timestamped
interface CardPayment {
  cardLastFourDigits: string;
}

function formatCardPayment(payment: CardPayment): string {
  // TODO: return "Card ending <lastFour> charged <amount> <currency> on <YYYY-MM-DD>"
  return '';
}
