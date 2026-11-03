Build the context for a grounded help assistant under a token budget: select relevant documents, compress long ones, fill the budget by priority, drop what does not fit, order everything deliberately, and always keep the system prompt and the latest question.

Inputs: `system` (text), `history` (messages alternating `user`, `assistant`, oldest first; one **turn** is a user message and the assistant reply after it), `question` (the latest user message), `documents` (`{ id, text, score }`, higher score = more relevant), `minScore` (default `0`) and `maxDocumentTokens` (default: no limit). Measure size with `countTokens(messages)` from `@dojo/ai`.

## 1. `compressText(text, maxTokens)`

When `countTokens(text) <= maxTokens`, return the text unchanged. Otherwise split it into sentences (after `.`, `!` or `?` followed by whitespace) and return the longest prefix of whole sentences, joined with single spaces, whose `countTokens` is at most `maxTokens`. If not even the first sentence fits, return the first `maxTokens × 4` characters.

## 2. `renderDocuments(documents)` (given)

Each document becomes `<document id="ID">`, a newline, the text, a newline and `</document>`; documents are joined with a newline.

## 3. `ContextBudgetError` and `buildContext(input)`

`input` holds the fields above plus `budget` (maximum `countTokens` of the returned messages). The messages are always: one system message with `system`, the kept history turns in chronological order, and one final user message whose content is `renderDocuments(includedDocuments) + '\n\n' + question`, or just `question` when no document is included.

1. If the system message plus the final message without documents exceed the budget, fail with a `ContextBudgetError` carrying `required` (their token count) and `budget`.
2. **Select:** documents with a score below `minScore` are dropped.
3. **Compress:** the rest are compressed with `compressText(text, maxDocumentTokens)`; record the ids whose text changed.
4. **Documents by relevance:** walk them from highest to lowest score (equal scores keep input order). Include a document if the messages with the documents included so far plus this one fit the budget; otherwise drop it and continue with the next.
5. **History, newest first:** then add whole turns from the newest backwards while the messages still fit. Stop at the first turn that does not fit: older turns are dropped too, so the kept history has no gaps.
6. **Order:** included documents are rendered from lowest to highest score, so the most relevant sits right before the question.

Return `{ messages, tokens, includedDocumentIds, droppedDocumentIds, compressedDocumentIds, keptTurns, droppedTurns }`: `tokens` is `countTokens(messages)`, `includedDocumentIds` follows the rendered order, `droppedDocumentIds` lists every document not included, and the turn fields count kept and dropped turns.

## 4. `answerWithContext(model, input, maxOutputTokens)`

Build the context with `budget = model.contextWindow - maxOutputTokens`, call `model.generate({ messages, maxTokens: maxOutputTokens })` and return `{ text, context }`.

The tests compute budgets from the rendering rules and check what was kept, dropped and compressed, the order, and that requests fit the fake model's context window.
