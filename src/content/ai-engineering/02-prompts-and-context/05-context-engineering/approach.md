1. Fix the shape of the output first: system message, history, final message with documents and question. Every decision is then "does this candidate set of messages fit?", answered by counting the real messages instead of estimating pieces.
2. Check the pinned part before anything else. If the system prompt and the question cannot fit, no amount of dropping helps, and a typed error with the numbers is better than a silently truncated question.
3. Shrink the candidate set cheaply before spending budget: the relevance floor removes noise and compression bounds each document, so one long policy cannot crowd out three short, relevant ones.
4. Fill by priority with skip-and-continue for documents (a smaller, less relevant one may still fit) and stop-at-first-miss for history (a conversation with gaps never happened).
5. Order last: chronology for history, ascending relevance for documents, question at the end.
6. Return what you decided, not just the messages: included, dropped and compressed ids plus turn counts are what you log to debug a wrong answer.
7. Derive the budget from the model, reserving the output tokens, so the builder protects you from context-length errors instead of discovering them in production.
