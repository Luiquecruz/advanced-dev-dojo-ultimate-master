TypeScript compares types by **structure**, not by name. If a value has the required members, it fits, no
matter where it came from. This is often called "duck typing": if it walks like a duck and quacks like a
duck, it is a duck.

```ts
interface Named { name: string }

class Planet {
  constructor(public name: string, public moons: number) {}
}

function greet(target: Named) { return `Hello, ${target.name}`; }
greet(new Planet('Mars', 2)); // fine: Planet has a name, no "implements" needed
```

The flip side: two types with the same structure are **interchangeable**, even when they mean different
things. `type UserId = string` and `type OrderId = string` are both just `string`, so mixing them up compiles.

A **brand** fixes that by adding a phantom property that no plain value has:

```ts
type UserId = string & { readonly brand: 'UserId' };

function toUserId(raw: string): UserId {
  if (!raw.startsWith('user_')) throw new Error('Invalid user id');
  return raw as UserId;   // the only place where a cast is allowed
}

function loadUser(id: UserId) { /* ... */ }
loadUser('user_1');            // Error: string is not assignable to UserId
loadUser(toUserId('user_1'));  // fine
```

The brand exists only in the type system, so at runtime the value is still a plain string. Keep the cast inside
a single validating function so every `UserId` in your program is known to be valid.
