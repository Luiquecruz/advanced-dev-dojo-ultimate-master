1. Treat selection as a ranking problem with constraints: one score (similarity to the query), then filters (floor, duplicates, budget), then a cut (k).
2. Embed each example once and keep its vector next to it: the same vector serves the query score and the duplicate check.
3. Make the ranking deterministic: sort by score and break ties by pool position, so the same request always gets the same examples and failures are reproducible.
4. Apply the filters while walking the ranking, not before: duplicates are only defined relative to what you already took, and the budget depends on what is already spent. Skip instead of stopping, so a short example can still use the remaining budget.
5. Reverse the selection at the end so the most similar example sits right before the question.
6. Keep the model call thin: build the conversation from the selected examples, normalize the reply against the closed label set, and return the example ids so every answer can be traced back to the examples that shaped it.
