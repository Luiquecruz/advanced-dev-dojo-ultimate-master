Start with `findReferences`: everything else uses it. A global regular expression with a negative lookbehind and lookahead keeps ids whole: `/(?<![\w-])REQ-\d+(?![\w-])/g`. `new Set(matches)` keeps the first appearance order.
---
Both parsers read the text line by line with one anchored pattern each, for example `/^\s*[-*]\s+(REQ-\d+):\s*(.*)$/` and `/^\s*[-*]\s+\[([ xX])\]\s+(TASK-\d+):\s*(.*)$/`. Before pushing a match, check whether the id is already in the result and throw `SpecError` if it is.
---
In `buildTraceability`, first compute, for every test, the set of known requirements it verifies: its direct requirement references plus the requirements of each known task it references. Record unknown ids on the way. Rows then filter tasks and tests per requirement, and the status follows from the two lengths. For `planTasks`, write a `readPlan(text)` that returns either the tasks or a problem description, and loop up to `maxAttempts`.
