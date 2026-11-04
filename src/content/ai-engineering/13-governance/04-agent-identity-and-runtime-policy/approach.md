1. Make identity explicit: every call names the agent, and, when it acts for a person, on whose behalf. Shared keys make every later step impossible.
2. Fix the attributes a decision may use (agent, tool scope, data classification, purpose, risk tier, side effect) and write the rules as an ordered, closed list, so each decision is reproducible and explainable.
3. Return reasons with every decision, not only an effect. Reasons are what the model, the reviewer and the auditor act on.
4. Keep a kill switch in the decision point itself: suspending an agent must take effect on its next call, without redeploying anything.
5. Record decisions in an append-only log where each entry commits to the previous one with a hash. Editing, deleting or reordering an entry then breaks the chain at a precise index.
6. Log what proves the decision without leaking data: a hash of the arguments identifies what was proposed without storing personal data in a log that lives for years.
7. At the model boundary, decide and audit before executing, so even calls that never run leave evidence.
