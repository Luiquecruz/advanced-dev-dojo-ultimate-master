## pattern: CardPayment extends Payment and Timestamped

```regex
interface\s+CardPayment\s+extends\s+(Payment\s*,\s*Timestamped|Timestamped\s*,\s*Payment)\s*\{
```

## type: CardPayment is usable as a Payment and as a Timestamped

```ts
type _ = [
  Expect<Extends<CardPayment, Payment>>,
  Expect<Extends<CardPayment, Timestamped>>,
  Expect<Equal<CardPayment['cardLastFourDigits'], string>>,
  Expect<Equal<keyof CardPayment, 'id' | 'amountInCents' | 'currency' | 'createdAt' | 'cardLastFourDigits'>>,
];
```

## type: A CardPayment without createdAt is rejected

```ts
// @ts-expect-error
const incomplete: CardPayment = { id: 'pay_2', amountInCents: 100, currency: 'EUR', cardLastFourDigits: '0001' };
```

## runtime: Formats the card payment

```js
const payment = { id: 'pay_1', amountInCents: 1234, currency: 'USD', createdAt: new Date('2024-05-01T10:00:00Z'), cardLastFourDigits: '4242' };
assert.equal(formatCardPayment(payment), 'Card ending 4242 charged 12.34 USD on 2024-05-01');
```

## runtime: Always prints two decimals

```js
const payment = { id: 'pay_3', amountInCents: 500, currency: 'BRL', createdAt: new Date('2023-12-31T23:00:00Z'), cardLastFourDigits: '9999' };
assert.equal(formatCardPayment(payment), 'Card ending 9999 charged 5.00 BRL on 2023-12-31');
```
