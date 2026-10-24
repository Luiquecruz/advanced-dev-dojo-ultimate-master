The syntax is `{ [K in keyof T as NewName]: Value }`. The value side can still use `T[K]`.
---
For `Getters`, the new name is a template literal: `` `get${Capitalize<string & K>}` ``. The `string & K` part drops symbol keys and satisfies `Capitalize`.
---
Filter by mapping unwanted keys to `never`: `as T[K] extends V ? K : never`. For `EventHandlers`, iterate over the union of events itself (`[Event in E as ...]`) and read `Event['type']`.
---
At runtime, loop over `Object.keys(source)`, build the name with `key.charAt(0).toUpperCase() + key.slice(1)`, store a closure that reads `source[key]` when called, and assert the final object to `Getters<T>`.
