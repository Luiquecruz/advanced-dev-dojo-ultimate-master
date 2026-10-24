Declare state as a class field: `protected readonly count = signal(0);`
---
Read a signal in the template by calling it: `{{ count() }}`. Update it with `this.count.update(value => value + 1)`.
---
Built-in control flow: `@if (count() >= 3) { <strong>Nice!</strong> }`.
