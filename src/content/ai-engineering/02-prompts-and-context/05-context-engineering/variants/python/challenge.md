Build the context for a grounded help assistant under a token budget: select relevant documents, compress long ones, fill the budget by priority, drop what does not fit, order everything deliberately, and always keep the system prompt and the latest question.

Inputs: `system` (text), `history` (message dicts alternating `user`, `assistant`, oldest first; one **turn** is a user message and the assistant reply after it), `question` (the latest user message), `documents` (dicts `{"id", "text", "score"}`, higher score = more relevant), `min_score` (default `0`) and `max_document_tokens` (default `math.inf`: no limit). Measure size with `count_tokens(messages)` from `dojo_ai`.

## 1. `compress_text(text, max_tokens)`

When `count_tokens(text) <= max_tokens`, return the text unchanged. Otherwise split it into sentences (after `.`, `!` or `?` followed by whitespace) and return the longest prefix of whole sentences, joined with single spaces, whose `count_tokens` is at most `max_tokens`. If not even the first sentence fits, return the first `max_tokens × 4` characters.

## 2. `render_documents(documents)` (given)

Each document becomes `<document id="ID">`, a newline, the text, a newline and `</document>`; documents are joined with a newline.

## 3. `ContextBudgetError` and `build_context(*, system, history, question, documents, budget, min_score=0, max_document_tokens=math.inf)`

`budget` is the maximum `count_tokens` of the returned messages. The messages are always: one system message with `system`, the kept history turns in chronological order, and one final user message whose content is `render_documents(included_documents) + "\n\n" + question`, or just `question` when no document is included.

1. If the system message plus the final message without documents exceed the budget, raise a `ContextBudgetError` carrying `required` (their token count) and `budget`.
2. **Select:** documents with a score below `min_score` are dropped.
3. **Compress:** the rest are compressed with `compress_text(text, max_document_tokens)`; record the ids whose text changed.
4. **Documents by relevance:** walk them from highest to lowest score (equal scores keep input order). Include a document if the messages with the documents included so far plus this one fit the budget; otherwise drop it and continue with the next.
5. **History, newest first:** then add whole turns from the newest backwards while the messages still fit. Stop at the first turn that does not fit: older turns are dropped too, so the kept history has no gaps.
6. **Order:** included documents are rendered from lowest to highest score, so the most relevant sits right before the question.

Return a dict `{"messages", "tokens", "includedDocumentIds", "droppedDocumentIds", "compressedDocumentIds", "keptTurns", "droppedTurns"}`: `"tokens"` is `count_tokens(messages)`, `"includedDocumentIds"` follows the rendered order, `"droppedDocumentIds"` lists every document not included, and the turn fields count kept and dropped turns.

## 4. `answer_with_context(model, context_input, max_output_tokens)`

`context_input` is a dict with the keyword arguments of `build_context` except `budget`. Build the context with `budget = model.context_window - max_output_tokens`, await `model.generate({"messages": ..., "maxTokens": max_output_tokens})` and return `{"text": ..., "context": ...}`.

The tests compute budgets from the rendering rules and check what was kept, dropped and compressed, the order, and that requests fit the fake model's context window.
