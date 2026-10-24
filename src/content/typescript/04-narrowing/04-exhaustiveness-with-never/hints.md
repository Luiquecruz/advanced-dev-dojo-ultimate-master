Change the parameter of `assertNever` from `unknown` to `never` and build the message with a template literal and `JSON.stringify(value)`.
---
Add `case 'triangle':` returning `(shape.base * shape.height) / 2`.
---
In `default`, `shape` is now `never`, so `return assertNever(shape);` compiles. Try removing the triangle case to see the error it produces.
