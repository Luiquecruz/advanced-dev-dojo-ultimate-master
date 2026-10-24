## pattern: Uses a #balance private field

```regex
#balance\b
```

## type: owner is readonly and the balance is not reachable

```ts
const account = new BankAccount('Ada');
const owner: string = account.owner;
// @ts-expect-error owner is readonly
account.owner = 'Eve';
// @ts-expect-error the balance is private
account.balance;
type _ = Expect<Equal<BankAccount['transferTo'], (target: BankAccount, amount: number) => void>>;
```

## runtime: The balance is hidden at runtime

```js
const account = new BankAccount('Ada');
account.deposit(50);
assert.deepEqual(Object.keys(account), ['owner']);
assert.equal(JSON.stringify(account), '{"owner":"Ada"}');
```

## runtime: deposit and withdraw validate their input

```js
const account = new BankAccount('Ada');
account.deposit(100);
account.withdraw(30);
assert.equal(account.getBalance(), 70);
assert.throws(() => account.deposit(0), RangeError);
assert.throws(() => account.withdraw(-5), RangeError);
assert.throws(() => account.withdraw(500), 'Insufficient funds');
assert.equal(account.getBalance(), 70);
```

## runtime: transferTo moves money between accounts

```js
const ada = new BankAccount('Ada');
const alan = new BankAccount('Alan');
ada.deposit(100);
ada.transferTo(alan, 40);
assert.equal(ada.getBalance(), 60);
assert.equal(alan.getBalance(), 40);
assert.throws(() => ada.transferTo(alan, 1000), 'Insufficient funds');
assert.equal(alan.getBalance(), 40);
```
