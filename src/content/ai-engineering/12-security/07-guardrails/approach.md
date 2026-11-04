1. Separate detection from validation: a pattern finds candidates, a checksum decides whether they are real. That is what keeps order numbers and dates from being redacted.
2. Order the redaction passes so earlier patterns cannot be broken by later ones: emails before anything numeric, phones before cards.
3. Treat the classifier as an unreliable dependency. Every way it can fail (error, incomplete reply, invalid JSON, unknown label) is the same outcome: a failed attempt. Bound the attempts, then return an explicit `'unavailable'` instead of guessing.
4. Decide the failure policy at the pipeline level: for a security rail, `'unavailable'` blocks. Make the reason distinct so monitoring can tell attacks from outages.
5. Order the input rails from cheapest to most expensive, and make sure rejected input never reaches a model.
6. Send only redacted text to every model, classifier included, then check the answer: completeness first (a truncated answer may cut a redaction in half), then redaction, then length.
7. Return which PII types were redacted on each side, so product and privacy teams can see what the feature touches.
