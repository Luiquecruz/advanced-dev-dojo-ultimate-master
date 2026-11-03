1. Record before you evaluate: hook into the agent loop and keep one step per model response (with its usage) and one per tool call, including the calls the loop rejected, because an attempted forbidden call is evidence too.
2. Express the acceptable behavior as properties instead of a golden path: required tools, forbidden tools, partial orders, argument predicates and limits all allow many valid trajectories.
3. Index tool steps once and evaluate each rule independently, collecting every violation with the step that caused it; a report that stops at the first problem hides the others.
4. Define "required" and "before" in terms of successful calls, so a failed lookup does not satisfy a prerequisite.
5. Derive cost and call counts from the recorded steps, then compare them with strict limits.
6. Aggregate across runs with a pass rate and violation counts per rule; the counts tell you which fix (prompt, tool description, harness rule, budget) pays off first.
