Start with the plan, not the prose, and apply the hard constraints first. Cross out every model that processes data outside the EU, then every model whose p95 alone breaks 1 500 ms. Only a few candidates survive.
---
No surviving model is both accurate enough and cheap enough on its own: compute 1 800 × cost per 1 000 for the 92%+ candidates and compare with $4 000. That points to a cheap primary plus an escalation model, and their latencies must add up to at most 1 500 ms.
---
The fallback replaces the primary when the primary's provider is down, so it must come from another provider, stay in the EU, answer within 1 500 ms and reach 88%. If you pick the self-hosted model anywhere in the plan, add its $1 500 a month to the projection even if it is idle most of the time.
---
Write the ADR from the plan: the context restates the forces with their numbers, the decision is one "We will..." sentence naming primary, escalation and fallback, and each rejected alternative ("the most accurate model for everything", "the US model", "self-host everything") cites the constraint that ruled it out.
