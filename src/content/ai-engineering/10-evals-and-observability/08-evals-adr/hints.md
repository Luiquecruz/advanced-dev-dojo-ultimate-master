Start from the numbers in the briefing, not the prose. The noise is 2.5 points and the product accepts 5, so the tolerance is a fraction strictly above `0.025` and at most `0.05`. Single runs flip cases, so `repeats` is at least 3. Then check the budget: `pullRequestCases × repeats × 0.01` must stay at or below $15.
---
Pick the judge with two filters: kappa of at least 0.7 and a provider other than Atlas, the generator's provider. The judge with the highest kappa fails the second filter (self-preference), which makes it a good rejected alternative.
---
Review capacity is 300 traces a week out of 40 000 drafts. A random rate of `0.0025` uses 100 of them; the rest can go to triggered samples. Include `forbidden-call` and a feedback trigger (`thumbs-down` or `draft-rewritten`). For drift, the history of a silent provider update points to a scheduled suite plus the `response-model-change` and `refusal-rate` alerts.
---
Write the ADR from the plan: the context restates noise, product rule, budget, privacy, review capacity and the incident; the decision names the gate, scorers, judge and production loop in one "We will" sentence; each rejected alternative (same-family judge, one run per case, content on spans, thumbs as the metric) cites the fact that rules it out.
