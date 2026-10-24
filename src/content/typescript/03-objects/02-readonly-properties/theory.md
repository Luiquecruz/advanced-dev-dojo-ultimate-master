The `readonly` modifier forbids **reassigning** a property after the object is created. It is the
type-level way to say "treat this value as immutable":

```ts
type Money = { readonly amount: number; readonly currency: string };

const price: Money = { amount: 10, currency: 'USD' };
price.amount = 12; // Error: Cannot assign to 'amount' because it is a read-only property.
```

Arrays have their own readonly form. `readonly T[]` (or `ReadonlyArray<T>`) removes every mutating
method such as `push`, `pop`, `splice` and `sort`:

```ts
const scores: readonly number[] = [1, 2, 3];
scores.push(4);                   // Error: Property 'push' does not exist
const more = [...scores, 4];      // fine: creates a new array
```

Instead of mutating, you return **new objects** built with the spread operator:

```ts
function raise(price: Money, delta: number): Money {
  return { ...price, amount: price.amount + delta };
}
```

Pitfalls: `readonly` is **shallow** (a `readonly items: string[]` property cannot be reassigned, but
`items.push()` still works unless the array itself is `readonly string[]`), and it exists only at
compile time. Nothing stops mutation at runtime, so use `Object.freeze` if you need that guarantee.
