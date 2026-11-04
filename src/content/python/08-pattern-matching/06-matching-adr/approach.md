1. Turn the briefing into the three figures: the number of types at the end of the horizon, the dispatches one instance performs per second, and the worst-case cost of one linear dispatch at the horizon.
2. Derive the per-message budget from the CPU share and the per-instance rate. Check a linear dispatch against it today and at the horizon, and note in which quarter it stops fitting.
3. List what each payload source gives the dispatcher: a tag inside a dict, a class with a `TYPE` attribute. Keep only the mechanisms whose key can tell every payload apart, and choose the one payload shape handlers receive.
4. Remove the mechanisms that need code you cannot keep: methods on classes that a generator overwrites.
5. Match the extension point to the mechanism, count the edits it causes to the shared file per quarter, and compare that count with the merge rule.
6. Decide where `match` still earns its place, and how an unknown type reaches the dead-letter topic.
7. Write the ADR: the numbers in the context, a `We will` decision naming the mechanism and the role of `match`, rejected alternatives with the fact that ruled each out, and honest negative consequences. Re-read every coherence rule against the plan.
