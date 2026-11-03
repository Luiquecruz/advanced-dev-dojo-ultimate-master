1. Write the stop rule as a pure function with an explicit precedence: success, then stuck, then failure count, then budget. Loops fail most often at the edges, and a pure function makes every edge testable without a model.
2. Make state the source of truth. Load it at the start, mutate it during the iteration, and save it at the end of every iteration, so a crash or a second worker continues from facts instead of from zero.
3. Treat terminal states as terminal. Returning early for `done` and `escalated` makes repeated triggers harmless and keeps budgets from resetting.
4. Close the loop with feedback: the next action sees the last verifier message, so iterations converge instead of repeating the first guess.
5. Detect lack of progress cheaply: an output identical to the previous failed one means more iterations will only spend money.
6. Escalate with context, once: the reason and the full state (iterations, failures, spending, last output and feedback) are what the human needs to take over.
