You only need three pieces of state: the consecutive failure count, the time the circuit opened (`undefined` while closed) and a flag saying whether the half-open trial is running. `state()` can be computed from them and `now()` every time it is called.
---
Start `call` by reading `state()`. Reject with `new Error('circuit open')` when it is `'open'`, or when it is `'half-open'` and the trial flag is set. Set the flag **before** the first `await`, so a second call that arrives while the trial is pending sees it.
---
In the half-open branch, `await fn()` inside `try`/`catch`/`finally`: success clears the opened time, failure stores `now()` as the new opened time and rethrows, `finally` clears the trial flag. `backoffDelay` is one line: the exponential value `baseMs * 2 ** attempt`, capped with `Math.min`, multiplied by `random()` and rounded down.
