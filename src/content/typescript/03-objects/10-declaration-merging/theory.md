Interfaces are **open**: declaring the same interface name twice in the same scope **merges** both
declarations into one type with every member.

```ts
interface Box { height: number }
interface Box { width: number }

const box: Box = { height: 2, width: 3 }; // both members are required
```

Type aliases are **closed**. Repeating `type Box = ...` is a "Duplicate identifier" error.

Merging is how libraries let you **augment** their types. A plugin can add fields to a framework's
interface, and global types can be extended from a module:

```ts
declare global {
  interface Array<T> {
    last(): T | undefined;
  }
}
```

Pitfalls: if two declarations list the **same property**, the types must be identical, otherwise you get
"Subsequent property declarations must have the same type". Merging can also surprise you: an accidental
second `interface User` somewhere in scope silently adds members. That is one reason some teams prefer
type aliases for internal models.
