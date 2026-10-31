1. Turn the briefing into constraints and sort them: data residency and latency are hard filters, accuracy is a target that escalation can help reach, and budget is a sum you compute.
2. Filter the table with the hard constraints first. Keep a note of why each removed model failed; those notes become your rejected alternatives.
3. For the survivors, test single-model plans against accuracy and budget. When none fits, consider a cascade: a cheap primary whose rejected answers escalate to an accurate model, and check that the two latencies together stay within budget.
4. Choose the fallback as a separate decision: it serves all traffic when the primary's provider is down, so check provider, region, latency and the outage accuracy floor for it alone.
5. Project the monthly cost with the formula from the briefing, including fixed hosting for any self-hosted model, and keep the number in the plan.
6. Write the record: forces with numbers in the context, one "We will" sentence, alternatives tied to the constraint that removed them, and honest negative consequences (the validator becomes critical, outages cost more, two providers to maintain).
