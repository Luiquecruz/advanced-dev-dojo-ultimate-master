`Payment` and `Timestamped` are already declared.

1. Make `CardPayment` **extend both** `Payment` and `Timestamped`, keeping its own
   `cardLastFourDigits: string`.
2. Implement `formatCardPayment(payment: CardPayment): string` returning
   `"Card ending <lastFour> charged <amount> <currency> on <YYYY-MM-DD>"`, where the amount is
   `amountInCents / 100` with exactly two decimals and the date comes from `createdAt.toISOString()`.

```ts
formatCardPayment({
  id: 'pay_1', amountInCents: 1234, currency: 'USD',
  createdAt: new Date('2024-05-01T10:00:00Z'), cardLastFourDigits: '4242',
});
// "Card ending 4242 charged 12.34 USD on 2024-05-01"
```
