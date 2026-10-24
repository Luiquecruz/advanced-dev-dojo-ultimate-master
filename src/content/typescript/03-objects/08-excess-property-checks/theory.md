Structural typing normally allows **extra** properties: an object with more members than required still fits.
There is one exception. When you pass a **fresh object literal** directly where a type is expected,
TypeScript reports properties the type does not know about. This catches typos:

```ts
interface ButtonOptions { label: string; disabled?: boolean }

function renderButton(options: ButtonOptions) { /* ... */ }

renderButton({ label: 'Save', disable: true });
// Error: Object literal may only specify known properties,
//        but 'disable' does not exist in type 'ButtonOptions'. Did you mean 'disabled'?
```

The check only applies to literals written in place. A value stored in a variable first is not "fresh", so
extra properties are allowed:

```ts
const options = { label: 'Save', disable: true };
renderButton(options); // compiles: the typo is silently ignored
```

Pitfall: adding a catch-all **index signature** such as `[key: string]: unknown` disables the check
completely, because every key becomes "known". Optional properties are where typos hurt most: a misspelled
optional key is simply never read, and the bug shows up as a default value at runtime.

If you really need to accept arbitrary extra data, model it explicitly (`metadata: Record<string, string>`)
instead of opening the whole type.
