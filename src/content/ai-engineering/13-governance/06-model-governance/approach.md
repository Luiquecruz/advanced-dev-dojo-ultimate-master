1. Approve before anything runs: a version enters the registry only with an approved license and a pinned, dated id. Floating aliases from providers hide behavior changes.
2. Separate the name the application uses (an alias like `support-default`) from the version behind it, so changing models is a registry operation, not a code change.
3. Gate promotion on evidence: every required eval suite must have a result above its minimum, and no suite may regress beyond a tolerance against what runs today.
4. Return every failing reason at once, so the person promoting knows exactly which evals to run or fix.
5. Make deprecation visible early: warn on every resolution inside the warning window, name the replacement, and refuse to serve a retired version rather than failing in the provider's error path.
6. Keep a pin history and a one-step rollback, so an incident after promotion is a registry command, and the history explains to an auditor which version answered when.
