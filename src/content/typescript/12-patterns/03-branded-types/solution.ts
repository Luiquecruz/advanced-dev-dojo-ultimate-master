declare const brand: unique symbol;

type Brand<T, Name extends string> = T & { readonly [brand]: Name };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
type Email = Brand<string, 'Email'>;
type Cents = Brand<number, 'Cents'>;

function toUserId(raw: string): UserId {
  if (!/^usr_\w+$/.test(raw)) {
    throw new TypeError('Invalid user id');
  }
  return raw as UserId;
}

function toEmail(raw: string): Email {
  const normalized = raw.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new TypeError('Invalid email');
  }
  return normalized as Email;
}

function toCents(amount: number): Cents {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError('Invalid amount');
  }
  return amount as Cents;
}

function sendInvoice(to: Email, userId: UserId, amount: Cents): string {
  return `${userId} ${to} ${amount}`;
}
