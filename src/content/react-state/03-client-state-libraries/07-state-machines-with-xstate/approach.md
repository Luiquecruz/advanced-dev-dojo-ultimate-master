1. List the states first (`editing`, `submitting`, `failure`, `success`) and which events each accepts. Everything not listed is ignored, which is what prevents double submits.
2. Put validation in a named guard inside `setup`, so the machine, the UI (`snapshot.can`) and the tests share one rule.
3. Model the charge as an invoked actor of `submitting`: it starts on entry and is stopped automatically when the state is left. Map `event.output` and `event.error` into context with `assign`.
4. Reset `error` on entry to `submitting`, so a retry never shows a stale message.
5. Make `success` final; the actor's `status` becomes `done`.
6. In React, render from `snapshot.matches(...)` and send events; the component holds no booleans of its own. Accepting a `machine` prop lets tests inject `paymentMachine.provide(...)` with fake actors.
