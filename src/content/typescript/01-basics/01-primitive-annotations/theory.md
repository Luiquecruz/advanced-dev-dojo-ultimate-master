TypeScript adds a **static type layer** on top of JavaScript. The compiler checks your code before it runs
and then erases every type, producing plain JavaScript.

The primitive types mirror JavaScript primitives: `string`, `number`, `boolean`, `bigint`, `symbol`,
`null` and `undefined`. You annotate a variable with a colon after its name:

```ts
const language: string = 'TypeScript';
let releaseYear: number = 2012;
let isTyped: boolean = true;
```

Once a variable has a type, assigning a value of a different type is a **compile-time error**:

```ts
releaseYear = '2012'; // Error: Type 'string' is not assignable to type 'number'.
```
