Classes can hide members from the outside world. TypeScript offers **two different mechanisms**, and they
behave very differently at runtime.

## TypeScript modifiers: `public`, `protected`, `private`

```ts
class Account {
  public owner: string;        // default: accessible everywhere
  protected limit = 500;       // accessible in this class and subclasses
  private balance = 0;         // accessible only inside Account

  constructor(owner: string) {
    this.owner = owner;
  }
}

const account = new Account('Ada');
account.balance;      // compile error: 'balance' is private
account['balance'];   // compiles! bracket access is an intentional escape hatch
```

These modifiers are **type-level only**. They are erased when TypeScript emits JavaScript, so `balance`
is an ordinary property: it shows up in `Object.keys`, `JSON.stringify` and the debugger, and plain
JavaScript callers can read or change it.

## JavaScript private fields: `#name`

ES2022 added **hard privacy** to the language. A field whose name starts with `#` is unreachable from
outside the class body, at compile time *and* at runtime:

```ts
class Wallet {
  #coins = 0;

  add(amount: number): void {
    this.#coins += amount;
  }

  hasMoreThan(other: Wallet): boolean {
    return this.#coins > other.#coins; // allowed: privacy is per class, not per instance
  }

  static isWallet(value: object): boolean {
    return #coins in value;            // ergonomic brand check (ES2022)
  }
}

Object.keys(new Wallet()); // []
JSON.stringify(new Wallet()); // "{}"
```

Methods and accessors can be private too: `#validate() { ... }`.

## `readonly`

`readonly` forbids reassignment after construction. It can be combined with any modifier and with `#`
fields (`readonly #id: string`). Like the TypeScript modifiers, it only exists in the type system.

```ts
class Order {
  readonly id: string;
  constructor(id: string) {
    this.id = id;          // allowed in the constructor
  }
  rename(id: string) {
    this.id = id;          // error: Cannot assign to 'id' because it is a read-only property
  }
}
```

## Which one should you use?

| | `private` | `#private` |
| --- | --- | --- |
| Checked by the compiler | yes | yes |
| Hidden at runtime | no | yes |
| Escape hatch | `obj['field']` | none |
| Works with `protected`-like sharing | `protected` exists | no `#` equivalent |
| Visible to `JSON.stringify` / `Object.keys` | yes | no |

`private` predates ES private fields and is still common in older code and in frameworks that need to
inspect instances (some serializers, test doubles). For new code that holds sensitive or invariant-bearing
state, prefer `#fields`: the guarantee survives compilation.

## Pitfalls

- `private` does not protect data at runtime. Treat it as documentation the compiler enforces.
- `#fields` cannot be accessed from subclasses. If subclasses need access, use `protected`.
- Proxies and `#fields` do not mix: a Proxy wrapping an instance throws when a method reads `this.#field`,
  because the Proxy is not the original object.
