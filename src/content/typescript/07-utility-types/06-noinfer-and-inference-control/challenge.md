Both functions infer a string union from a list, but a typo in the other argument currently **widens** the
union instead of being rejected. Use **`NoInfer`** so the list is the only inference source, and finish the
runtime code.

1. `createStateMachine(states, initial)` returns a `StateMachine<TState>`:
   - `initial` must be one of `states` at compile time (`NoInfer`)
   - `current` is the current state, `history()` returns every state visited so far (starting with
     `initial`)
   - `transition(to)` moves to `to`; at runtime it throws an `Error` containing `Unknown state` when `to` is
     not in `states`
2. `parseOption(allowed, input, fallback)` returns `input` when it is one of `allowed`, otherwise
   `fallback`. `fallback` must be one of `allowed` at compile time (`NoInfer`).

```ts
const light = createStateMachine(['red', 'yellow', 'green'], 'red');
light.transition('green');
light.history();              // ['red', 'green']
createStateMachine(['on', 'off'], 'of'); // compile error
parseOption(['asc', 'desc'], 'up', 'asc'); // 'asc'
```
