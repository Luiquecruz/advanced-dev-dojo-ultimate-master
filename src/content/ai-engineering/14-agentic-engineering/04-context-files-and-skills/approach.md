1. Validate skills when they are installed, not when they are used: a bad name or a missing description is a packaging error, and the folder name check catches copy-paste mistakes.
2. Resolve context files by path segments, root first and nearest last, so the most specific rule is the latest the model reads.
3. Treat always-on context as non-negotiable: if it does not fit, fail loudly instead of trimming the test command or the forbidden list.
4. Keep the skill index metadata-only. It is the price of discoverability; bodies are paid only when selected.
5. Rank by a cheap, explainable score (similarity plus explicit triggers), and apply a threshold, a count limit and the budget in that order, recording why each skill was skipped.
6. Let the model ask for what preselection missed, through the same budget and the same section format, and answer every bad request with a message it can act on.
