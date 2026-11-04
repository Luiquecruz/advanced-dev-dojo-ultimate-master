1. Treat the call stack as a linked list of frame objects: every question about "who called" is a count of `f_back` steps from a known starting frame, and the starting frame decides the off-by-one.
2. For `caller_name`, write down which frame each step reaches (the helper itself, its caller, the caller's caller) before coding the loop, then add `skip`. Reject a negative `skip` up front and turn a `None` from `f_back` into `ValueError`, so a short stack fails loudly instead of returning the wrong name.
3. Release frames in a `finally`: a frame stored in a local of the frame it points to is a reference cycle that keeps every local alive.
4. For `call_path`, let `traceback.extract_stack` do the walking and ordering, and choose its starting frame so the helper is excluded.
5. For `raised_in`, remember how a traceback grows: each unwound level is inserted in front, so the head is where the error was caught and the tail is where it was raised.
6. For `exception_chain`, reproduce the printing rule rather than inventing one: cause beats context, a suppressed context ends the chain, and an exception seen twice ends it too. `TracebackException` already encodes the last rule and gives you the printed type names.
7. Check each helper against a lambda, a method, a bare re-raise, `raise ... from None` and a hand-made cycle: those are the cases where string parsing and naive loops break.
