1. Read the briefing as three lists: what must never happen, what the task needs, and what needs a human. They map directly to deny, allow and ask.
2. Write the deny rules first and test them against every spelling of each forbidden action (flag before or after the branch, files at any depth). Deny-first precedence then lets the allow list stay simple.
3. Keep the allow list as narrow as the task: exact check commands, the packages folder, and pushes to agent branches only. Anything else falls to ask, which in an unattended run means "escalate", not "go ahead".
4. Shrink the reach independently of the rules: one root, two hosts, and credentials scoped to the task. A rule gap should still hit a wall.
5. Turn the briefing's history and compliance rules into enforcement: a hook for the incident, redaction before auditing, and hooks that fail closed.
6. Define done with ordered verifiers and bound the loop with numbers that agree with each other: failures from the briefing, iterations within the budget, and a named escalation target.
7. Write the record from the plan, with alternatives tied to the facts that rule them out and honest negative consequences.
