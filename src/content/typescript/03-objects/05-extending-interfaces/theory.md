Interfaces can **inherit** members from other interfaces with `extends`. The child gets every member of the
parent plus its own, which keeps related shapes in sync:

```ts
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

const rex: Dog = { name: 'Rex', breed: 'Beagle' };
```

An interface may extend **several** interfaces at once, which is handy for mixing small reusable pieces:

```ts
interface Identified { id: string }
interface Named { name: string }

interface Product extends Identified, Named {
  priceInCents: number;
}
```

Because `Product` extends `Named`, a `Product` can be passed anywhere a `Named` is expected. This is
**subtyping**: the child is a more specific version of the parent.

Pitfall: a child may only **narrow** an inherited property, never change it to an incompatible type.
`interface Child extends Animal { name: number }` is a compile error ("Interface 'Child' incorrectly extends
interface 'Animal'"), while `name: 'Rex' | 'Fido'` would be allowed because it is a subtype of `string`.
