1. Read each signature and list which names belong to the helper (`function`, `attempts`) and which belong to the callee (everything else).
2. Notice the `/` after `function`: it is positional-only, so a callee keyword with the same name lands in `kwargs` instead of colliding.
3. In `forward`, unpack both collections at the call site and build the record from the original tuple and dict.
4. In `retry_call`, separate the three outcomes: success returns immediately, failure records the error and tries again, exhaustion re-raises the last error.
5. In `compose`, think of the functions as a pipeline fed by one value; an empty pipeline must hand the value back untouched.
