Improve retrieval on both sides of the search with a model: rewrite the query before searching (multi-query and HyDE) and rerank candidates after it. Query-side steps and the reranker are optional improvements, so none of them may ever break retrieval: every failure falls back to what you had without the model.

`model` is any object with `await model.generate(request)`; the tests pass `create_model()` from `dojo_ai`. Requests and responses are dicts with the provider's camelCase keys. A reply is **usable** when its `"finishReason"` is `"stop"` or `"length"`. Any other finish reason (`"refusal"`, `"content_filter"`, ...) or a raised exception (such as `ModelError`) counts as no reply.

## 1. `parse_json_loosely(text)`

Return the parsed value of the first of these that parses with `json.loads`: the stripped text; the content of a fenced block (three backticks, optionally followed by `json`); the span from the first `{` to the last `}`. Try each candidate as is and, if that fails, after repairing it: replace single quotes with double quotes and remove commas that come right before `}` or `]` (spaces allowed between). Return `None` when nothing parses.

## 2. `async generate_queries(model, question, *, count=3)`

Make one request with a system message asking for `count` search rewrites, the question as the user message, and `"responseFormat": {"type": "json"}`. The expected reply is `{"queries": [...]}`, read with `parse_json_loosely`.

Return the original `question` first, followed by the rewrites in order, stripped, skipping anything that is not a string, is empty, or repeats an earlier entry (comparison ignores case and surrounding spaces, and includes the question). Return at most `count + 1` entries. When there is no usable reply, it does not parse, or `"queries"` is not a list, return `[question]`.

## 3. `async hyde_query(model, question)`

Make one request asking the model to write a short passage that would answer the question (plain text, the question as the user message). When the reply is usable and its stripped text is not empty, return the question, a blank line and the stripped passage: `f"{question}\n\n{passage}"`. Otherwise return the question.

## 4. `async rerank(model, query, candidates, *, top_k=None)`

`candidates` is a list of `{"id", "text"}` dicts in retrieval order; `top_k=None` means every candidate. With no candidates, return `{"results": [], "reranked": False}` without calling the model.

Otherwise make **one** request with `"responseFormat": {"type": "json"}` whose messages contain the query and every candidate's id and text. The expected reply is `{"scores": [{"id": "...", "score": 7}]}`, read with `parse_json_loosely`. A score entry is **valid** when it is a dict, its `"id"` is one of the candidates' ids and its `"score"` is a finite number (`int` or `float`, not `bool`) from 0 to 10; for an id with several valid entries, the first one wins. Everything else is ignored.

Return `{"results": ..., "reranked": ...}`:

- `"results"`: the candidates with a valid score, sorted from the highest score to the lowest (ties keep retrieval order), followed by the candidates without one, in retrieval order. Each result is `{"id", "text", "score"}`, where `"score"` is the valid score or `None`. Return the first `top_k`.
- `"reranked"`: `True` when at least one valid score was used.

When there is no usable reply or it does not parse, every candidate is unscored: the results keep retrieval order and `"reranked"` is `False`.
