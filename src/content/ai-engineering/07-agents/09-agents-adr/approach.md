1. Turn the briefing into constraints: the pilot decides the pattern, the catalog and the task decide the tools, the finance policy decides the approval rule, the traces and targets decide the budgets, and the operations notes decide durability.
2. Justify the pattern with evidence. A workflow that resolves 41% against an agent at 83%, because the number of lookups varies, is the kind of fact that makes an agent worth its cost.
3. Grant tools by need, not by availability. Keep the read tools and the two write tools a refund requires; leave out tools owned by other teams or able to touch everything.
4. Gate by risk: approval for refunds above the policy threshold, nothing on read-only tools.
5. Derive the budgets so they agree: steps from the trace distribution, then check that the cost and time caps cover that many steps and stay within the per-ticket targets. Add stuck detection because traces show repetition, and route exhausted runs to the human queue.
6. Make long runs durable: checkpoints every step, idempotency keys on every write tool.
7. Write the record last: forces with numbers, one "We will" sentence, rejected alternatives tied to facts, and honest negative consequences such as the review workload and the new components to operate.
