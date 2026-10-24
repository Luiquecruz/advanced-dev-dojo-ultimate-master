## Annotating parameters and return values

Functions are the main boundary of your code, so that is where annotations pay off the most. Each parameter gets a type after its name, and the return type goes after the parameter list:

```ts
function add(a: number, b: number): number {
  return a + b;
}

add(1, 2);      // 3
add(1, '2');    // Error: Argument of type 'string' is not assignable to parameter of type 'number'
add(1);         // Error: Expected 2 arguments, but got 1
add(1, 2, 3);   // Error: Expected 2 arguments, but got 3
```

Unlike JavaScript, TypeScript checks the **number** of arguments too. Calling a function with missing or extra arguments is an error unless the parameters are optional or rest parameters (next lesson).

In `strict` mode an unannotated parameter is an error (`noImplicitAny`), because nothing else tells the compiler what callers will pass:

```ts
function double(value) { // Error: Parameter 'value' implicitly has an 'any' type
  return value * 2;
}
```

## Return types: infer or annotate?

The return type is inferred from the `return` statements, so it is optional. Write it explicitly when:

- the function is **exported** or part of a public API: the annotation documents the contract and stops an accidental change inside the body from leaking to every caller;
- the function is **recursive**, because inference cannot always resolve itself;
- you want the compiler to verify that **every path** returns the right thing.

```ts
function parseAge(input: string): number {
  const age = Number(input);
  if (Number.isNaN(age)) {
    return null; // Error: Type 'null' is not assignable to type 'number'
  }
  return age;
}
```

Without the annotation, the function would silently be inferred as `number | null`, and the mistake would surface far away at a call site.

## Arrow functions and function expressions

The same syntax applies to every function form:

```ts
const multiply = (a: number, b: number): number => a * b;

const greet = function (name: string): string {
  return `Hello, ${name}`;
};
```

If the variable itself has a function type, the parameters are **contextually typed** and need no annotation (covered in the function types lesson).

## Async functions

An `async` function always returns a `Promise`, so its return annotation is `Promise<T>`, where `T` is the type of the value you `return`:

```ts
async function loadUserName(id: number): Promise<string> {
  const response = await fetch(`/api/users/${id}`);
  const user: { name: string } = await response.json();
  return user.name;
}
```

Throwing inside an async function rejects the promise; it does not change the type.

## Legacy: JSDoc types in JavaScript files

Before migrating to `.ts`, many projects typed plain JavaScript with JSDoc comments and `// @ts-check`. TypeScript understands them, and you will still find them in config files and older libraries:

```js
// @ts-check
/**
 * @param {number} price
 * @param {number} percent
 * @returns {number}
 */
function discount(price, percent) {
  return price * (1 - percent / 100);
}
```

## Pitfalls

- `any` on a parameter disables checks for every caller *and* inside the body. Prefer a precise type, a union, or `unknown`.
- A return annotation of `void` on a function that returns a value hides the value from callers.
- Rounding money with floating point: `19.99 * 0.9` is `17.991000000000003`. Round explicitly when the result is displayed or compared.
