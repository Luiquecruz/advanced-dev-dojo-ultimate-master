An **interface** is another way to name an object shape. It reads like a contract: "anything of this
type has these members".

```ts
interface BankAccount {
  owner: string;
  balance: number;
  deposit(amount: number): void;   // method signature
  format: () => string;            // property holding a function
}
```

Interfaces can describe **methods** with the short `name(parameters): ReturnType` syntax. When you build an
object literal for that interface, the methods can use `this` to reach the other members:

```ts
function openAccount(owner: string): BankAccount {
  return {
    owner,
    balance: 0,
    deposit(amount) {
      this.balance += amount;  // amount is inferred as number from the interface
    },
    format() {
      return `${this.owner}: ${this.balance}`;
    },
  };
}
```

Notice that `amount` needs no annotation: the return type gives the object literal a **contextual type**,
so every member is checked against the interface.

Pitfalls: methods written as arrow functions inside the object literal do **not** get their own `this`, so
`this.balance` would not refer to the account. Also, forgetting a member or misspelling a method name is a
compile error, which is exactly the safety net you want.
