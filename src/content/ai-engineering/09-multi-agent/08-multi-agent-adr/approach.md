1. Read the briefing as data: requirements per feature, a pilot table, a cost model, a provider limit, incidents and integrations.
2. Choose the architecture per feature by filtering the pilot rows against every requirement. Measurements decide, and different features can land on different designs.
3. Derive the orchestrator limits from the cost model so they agree with each other: planner attempts for malformed plans, the worker cap from the remaining budget, concurrency under the provider limit.
4. Turn each incident into a rule in the plan: a delegation depth, output validation, a failure policy with a minimum success share.
5. Pick the protocol per integration from what is on the other side and how long it works.
6. Write the record from the plan, with each rejected alternative tied to the measurement that rules it out and honest negative consequences.
