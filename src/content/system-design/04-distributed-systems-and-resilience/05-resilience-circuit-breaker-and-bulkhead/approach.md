1. Treat the breaker as a state machine with three states and write down each transition first: closed → open on the threshold-th consecutive failure, open → half-open when the clock passes `openMs`, half-open → closed on a successful trial and half-open → open on a failed one.
2. Derive the open/half-open distinction from time instead of storing it: keeping only the moment the circuit opened means `state()` is always correct, even if nobody calls the breaker for a while.
3. Make "fail fast" really fast: the open check happens before `fn` is touched, so a broken dependency receives no traffic at all while the circuit is open.
4. Limit the half-open state to one request in flight. The point of the trial is to test recovery with minimal load; letting every waiting caller through would hit a barely recovered dependency with the full load again.
5. Keep the errors honest: closed and the trial rethrow the dependency's own error, so callers can tell "the call failed" from "the breaker refused to call".
6. For backoff, compute the exponential ceiling, cap it, then let `random()` pick a point between zero and that ceiling. The randomness is what spreads thousands of clients apart.
