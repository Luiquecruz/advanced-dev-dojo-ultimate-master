## Structural typing has a blind spot

TypeScript compares types by **shape**. Two aliases of `string` are the same type, so nothing stops you from mixing them up:

```ts
type UserId = string;
type OrderId = string;

function cancelOrder(orderId: OrderId) { /* ... */ }

const userId: UserId = 'usr_42';
cancelOrder(userId); // compiles, cancels the wrong thing
```

The same happens with numbers in different units (cents vs dollars, milliseconds vs seconds) and with strings that have been validated vs raw user input.

## Branding adds a phantom property

A **branded type** (also called a *nominal* or *opaque* type) intersects the base type with a property that never exists at runtime. Only values that carry the brand fit:

```ts
declare const brand: unique symbol;

type Brand<T, Name extends string> = T & { readonly [brand]: Name };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

cancelOrder(userId);   // Error: 'UserId' is not assignable to 'OrderId'
cancelOrder('ord_7');  // Error: a plain string has no brand
```

Details worth noticing:

- `declare const brand: unique symbol` creates a **type-level** symbol. `declare` emits no code, and a symbol key cannot collide with real properties or show up in autocomplete as a normal key.
- The brand's value is a different string literal for each type, so `UserId` and `OrderId` are incompatible with each other.
- A branded value **is still** a `string`: `userId.toUpperCase()`, template literals and comparisons all work, and passing it where a `string` is expected is fine.

## Smart constructors

Since plain values cannot be assigned to a brand, the **only** way to obtain one is a function that validates its input and then asserts the brand. That is the one place where an `as` cast is legitimate:

```ts
function toOrderId(raw: string): OrderId {
  if (!/^ord_\w+$/.test(raw)) {
    throw new TypeError(`Invalid order id: ${raw}`);
  }
  return raw as OrderId;
}
```

Every `OrderId` in the program has now passed validation. The type documents a **guarantee**, not just a shape: "parse, don't validate".

You can also brand with type predicates or assertion functions when you prefer narrowing over conversion:

```ts
function isEmail(value: string): value is Email {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}
```

## Units of measure

Brands shine for numbers:

```ts
type Cents = Brand<number, 'Cents'>;
type Dollars = Brand<number, 'Dollars'>;

function toDollars(cents: Cents): Dollars {
  return (cents / 100) as Dollars;
}
```

Arithmetic on a brand returns a plain `number` (`cents + 1` is `number`), which is usually what you want: the result must be re-branded deliberately.

## Ecosystem

Validation libraries generate brands for you. Zod has `z.string().email().brand<'Email'>()`, Valibot has `brand()`, and Effect ships `Brand.nominal`. Their parsed output is branded, so data that crossed the validation boundary is distinguishable from raw input.

## Alternatives and history

- Before `unique symbol` (TypeScript 2.7), brands used string keys such as `{ __brand: 'UserId' }`. It works, but the fake property shows up in autocomplete and can collide.
- Classes with a `private` or `#private` member are nominal too, but they cost a runtime object per value.
- `enum` members are nominal as well, yet enums are not erasable syntax.

## Pitfalls

- The brand is a lie at runtime: `JSON.parse` output or values from an API are **never** branded until they pass through a constructor. Brand at the boundary.
- Do not sprinkle `as UserId` around the codebase; that bypasses validation and defeats the pattern. Keep casts inside the smart constructors.
- Branding objects is possible but rarely useful; prefer it for primitives.
