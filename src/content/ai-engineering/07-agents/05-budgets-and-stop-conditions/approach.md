1. List every way a run can end before writing the loop: a final answer, a refusal, and one reason per budget. Give each a name the caller can switch on, plus a sentence a human can read in a log.
2. Decide where each check belongs. Limits that protect the next call (steps, wall time) are checked before calling; limits measured by the call (tokens, cost) are checked right after it, using the provider's own `usage` instead of an estimate.
3. Stop before acting when the budget is gone. If a response exhausts the token or cost budget, its tool calls are not executed: a side effect you cannot afford to follow up should not start.
4. Let a real answer win. A final answer that arrives is the outcome the budget was protecting; returning it is better than discarding paid-for work.
5. Inject time instead of reading the system clock, so timeouts are testable and deterministic.
6. Detect a stuck agent by its behavior, not its words: the same tool with the same arguments, compared after normalizing key order, repeated several times in a row. Stopping it early saves the rest of the budget for a human or a different strategy.
7. Return the totals with every stop reason, because the caller needs them for cost accounting, alerts and evals whether the run succeeded or not.
