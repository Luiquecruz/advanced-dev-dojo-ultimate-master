1. Draw the four layers as nested boxes, outermost first, and trace three calls through them: a cache hit, a call that fails twice with `ConnectionError`, and a call with an expired token.
2. For each layer, decide where its state lives: the injected store, list and token source, plus locals of each call. Nothing goes at module level.
3. Write each layer as a pass-through wrapper with `functools.wraps`, then add its single behavior and its failure path.
4. Compose the layers in `build_client` in the stated order and check the consequences: what a hit skips, how many samples a retried call records, and which token each attempt sends.
5. Build two clients side by side and confirm their calls, stores and metrics stay separate; then follow `__wrapped__` from the client down to the original call.
