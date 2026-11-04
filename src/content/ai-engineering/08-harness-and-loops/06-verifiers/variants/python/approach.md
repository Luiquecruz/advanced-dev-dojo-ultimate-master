1. Separate the three roles: the model proposes, verifiers judge, the loop decides what happens next. Verifiers are plain functions from output to a verdict, so they can be tested and reused without a model.
2. Check that the answer is complete before judging its content. A truncated or refused response is its own failure with its own feedback.
3. Run verifiers from cheapest to most expensive and stop at the first failure: it saves time and money, and one focused complaint is easier for the model to fix than five.
4. Make feedback actionable: name the verifier and list the exact failing inputs or fields. Keep the previous answer in the history so the next attempt is an edit, not a fresh guess.
5. Bound the attempts and return a structured result either way: the status, the last output, the number of calls and every failure. That record is what an escalation step or a human needs.
6. Never turn a harness error into a verdict. A verifier that raises or a model outage ends the run with the original exception instead of counting as a pass or a failed attempt.
