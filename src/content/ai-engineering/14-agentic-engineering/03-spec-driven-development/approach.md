1. Make ids machine-readable first. A whole-word pattern for `REQ-n` and `TASK-n` is the single rule every other function relies on, so test it on the tricky cases (`REQ-12` vs `REQ-1`, prefixes, suffixes).
2. Parse conservatively: only lines that match the exact list-item shape count, so prose that mentions a removed requirement does not resurrect it. Duplicate ids are errors, because a matrix keyed by a duplicated id silently merges two requirements.
3. Resolve each test once to the set of known requirements it verifies, directly or through a task. That set answers both "which tests verify REQ-2" and "does this test verify anything".
4. Collect unknown ids while resolving instead of in a second pass: they are drift between the spec, the plan and the tests.
5. Derive status from counts (`covered`, `untested`, `unplanned`) and coverage from statuses, never store them separately.
6. Treat the model's plan as untrusted input: validate its shape, feed the problem back once or twice, then fail loudly. Keep unknown references in a valid plan so the matrix, not the parser, reports them.
