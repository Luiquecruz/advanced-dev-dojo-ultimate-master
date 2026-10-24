## "This or that"

A **union type** `A | B` describes a value that can be *any one* of its members:

```ts
type Id = string | number;

function printId(id: Id) {
  console.log(`Your id is ${id}`);
}

printId(101);       // ok
printId('a-202');   // ok
printId(true);      // Error: Argument of type 'boolean' is not assignable to parameter of type 'Id'
```

Unions are everywhere in real code: optional values (`User | undefined`), inputs that accept several formats (`string | string[]`), sets of options (`'sm' | 'md' | 'lg'`), and API responses that can succeed or fail.

## You can only use what all members share

The compiler only allows operations that are valid for **every** member of the union:

```ts
function shout(id: string | number) {
  id.toString();      // ok: both strings and numbers have toString
  id.toUpperCase();   // Error: Property 'toUpperCase' does not exist on type 'number'
}
```

The same applies to unions of object types: only the common properties are accessible.

```ts
type Cat = { name: string; meow(): void };
type Dog = { name: string; bark(): void };

function greet(pet: Cat | Dog) {
  pet.name;   // ok, both have it
  pet.bark(); // Error: Property 'bark' does not exist on type 'Cat'
}
```

## Narrowing

To use member-specific operations you first **narrow** the union with a runtime check. Inside the checked branch, the compiler knows the narrower type:

```ts
function format(id: string | number): string {
  if (typeof id === 'string') {
    return id.toUpperCase();           // id: string
  }
  return id.toFixed(0).padStart(6, '0'); // id: number
}
```

After the `if` returns, the rest of the function only sees the remaining member. The next lessons cover every narrowing tool: `typeof`, `instanceof`, `in`, equality, discriminants and custom type guards.

## Unions and arrays

Parentheses matter:

| Type | Meaning |
| --- | --- |
| `string \| number[]` | a string, or an array of numbers |
| `(string \| number)[]` | an array where each element is a string or a number |
| `string[] \| number[]` | either an array of only strings or an array of only numbers |

A very common union is "one or many": `string | string[]`. Normalize it once at the start of the function and work with a single shape afterwards:

```ts
function toList(input: string | string[]): string[] {
  return Array.isArray(input) ? input : [input];
}
```

## Unions vs intersections

`A | B` means "a value of type A **or** of type B": more possible values, fewer guaranteed properties. `A & B` (covered in the objects module) means "both at once": fewer possible values, more properties. A handy mental model is set theory: a union of two sets contains more elements, but you only know what they all have in common.

## Pitfalls

- **Accessing a property that exists on one member only** is an error, even if your current value happens to have it. Narrow first.
- **Unions of arrays are awkward to iterate.** Calling `map` on `string[] | number[]` works in recent versions, but the callback parameter becomes `string | number`. Prefer a single array type of a union when elements can be mixed.
- **Too many members** is a design smell. If every function starts with a large `if` chain, a discriminated union (lesson 3) usually models the data better.
