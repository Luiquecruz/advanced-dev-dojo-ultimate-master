## type: Plain values are rejected

```ts
// @ts-expect-error
const userId: UserId = 'usr_1';
// @ts-expect-error
const email: Email = 'ada@example.com';
// @ts-expect-error
const amount: Cents = 500;
```

## type: Brands of different kinds are incompatible

```ts
type _ = [
  ExpectFalse<Extends<UserId, OrderId>>,
  ExpectFalse<Extends<OrderId, UserId>>,
  Expect<Extends<UserId, string>>,
  Expect<Extends<Cents, number>>,
  Expect<Equal<Brand<string, 'UserId'>, UserId>>,
];
```

## type: sendInvoice only accepts values from the smart constructors

```ts
sendInvoice(toEmail('ada@example.com'), toUserId('usr_1'), toCents(500));
// @ts-expect-error
sendInvoice(toEmail('ada@example.com'), toUserId('usr_1'), 500);
// @ts-expect-error
sendInvoice(toUserId('usr_1'), toEmail('ada@example.com'), toCents(500));
```

## runtime: toEmail normalizes and validates

```js
assert.equal(toEmail('  Ada@Example.COM '), 'ada@example.com');
assert.throws(() => toEmail('not-an-email'), 'Invalid email');
assert.throws(() => toEmail('a@b'), TypeError);
```

## runtime: toUserId and toCents validate their input

```js
assert.equal(toUserId('usr_42'), 'usr_42');
assert.throws(() => toUserId('ord_42'), 'Invalid user id');
assert.equal(toCents(1999), 1999);
assert.throws(() => toCents(19.99), RangeError);
assert.throws(() => toCents(-1), 'Invalid amount');
```

## runtime: sendInvoice formats the invoice line

```js
assert.equal(sendInvoice(toEmail('Grace@Navy.mil'), toUserId('usr_3'), toCents(4200)), 'usr_3 grace@navy.mil 4200');
```
