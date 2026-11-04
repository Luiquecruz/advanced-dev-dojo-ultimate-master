1. Give every call a cost owner: a team and a feature. Without that context, spend can be totalled but never attributed or limited.
2. Decide before the call with an upper bound: input tokens are known and output is capped by `maxTokens`, so the worst case is computable and a budget can refuse before money is spent.
3. Record after the call with the provider's actual usage, so budgets and reports reflect what you pay, not what you guessed.
4. Layer budgets from wide to narrow (company, team, feature) and let each one block only its own scope, so one runaway feature does not stop the rest of the team.
5. Alert before refusing: soft thresholds warn owners while there is still time to react, each one once; the hard limit is the last line.
6. Add rate limits per team for bursts that budgets react to too late, and tell the caller when to retry.
