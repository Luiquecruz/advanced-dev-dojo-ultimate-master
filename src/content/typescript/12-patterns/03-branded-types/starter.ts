declare const brand: unique symbol;

// TODO: define type Brand<T, Name extends string> = T & { readonly [brand]: Name }

// TODO: brand these aliases
type UserId = string;
type OrderId = string;
type Email = string;
type Cents = number;

function toUserId(raw: string): UserId {
  // TODO: validate /^usr_\w+$/ or throw TypeError("Invalid user id")
  return raw;
}

function toEmail(raw: string): Email {
  // TODO: trim, lowercase, validate or throw TypeError("Invalid email")
  return raw;
}

function toCents(amount: number): Cents {
  // TODO: accept non-negative integers only, otherwise throw RangeError("Invalid amount")
  return amount;
}

function sendInvoice(to: Email, userId: UserId, amount: Cents): string {
  return `${userId} ${to} ${amount}`;
}
