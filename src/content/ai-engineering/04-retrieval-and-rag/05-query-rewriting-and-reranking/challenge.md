Improve retrieval on both sides of the search with a model: rewrite the query before searching (multi-query and HyDE) and rerank candidates after it. Query-side steps and the reranker are optional improvements, so none of them may ever break retrieval: every failure falls back to what you had without the model.

`model` is any object with `generate(request)`; the tests pass `createModel()` from `@dojo/ai`. A reply is **usable** when its `finishReason` is `'stop'` or `'length'`. Any other finish reason (`'refusal'`, `'content_filter'`, ...) or a thrown error counts as no reply.

## 1. `parseJsonLoosely(text)`

Return the parsed value of the first of these that parses: the trimmed text; the content of a fenced block (three backticks, optionally followed by `json`); the span from the first `{` to the last `}`. Try each candidate as is and, if that fails, after repairing it: replace single quotes with double quotes and remove commas that come right before `}` or `]` (spaces allowed between). Return `undefined` when nothing parses.

## 2. `generateQueries(model, question, { count = 3 })`

Make one request with a system message asking for `count` search rewrites, the question as the user message, and `responseFormat: { type: 'json' }`. The expected reply is `{ "queries": [...] }`, read with `parseJsonLoosely`.

Return the original `question` first, followed by the rewrites in order, trimmed, skipping anything that is not a string, is empty, or repeats an earlier entry (comparison ignores case and surrounding spaces, and includes the question). Return at most `count + 1` entries. When there is no usable reply, it does not parse, or `queries` is not a list, return `[question]`.

## 3. `hydeQuery(model, question)`

Make one request asking the model to write a short passage that would answer the question (plain text, the question as the user message). When the reply is usable and its trimmed text is not empty, return the question, a blank line and the trimmed passage: `` `${question}\n\n${passage}` ``. Otherwise return the question.

## 4. `rerank(model, query, candidates, { topK })`

`candidates` is a list of `{ id, text }` in retrieval order; `topK` defaults to the number of candidates. With no candidates, return `{ results: [], reranked: false }` without calling the model.

Otherwise make **one** request with `responseFormat: { type: 'json' }` whose messages contain the query and every candidate's id and text. The expected reply is `{ "scores": [{ "id": "...", "score": 7 }] }`, read with `parseJsonLoosely`. A score entry is **valid** when its `id` is one of the candidates' ids and its `score` is a finite number from 0 to 10; for an id with several valid entries, the first one wins. Everything else is ignored.

Return `{ results, reranked }`:

- `results`: the candidates with a valid score, sorted from the highest score to the lowest (ties keep retrieval order), followed by the candidates without one, in retrieval order. Each result is `{ id, text, score }`, where `score` is the valid score or `null`. Return the first `topK`.
- `reranked`: `true` when at least one valid score was used.

When there is no usable reply or it does not parse, every candidate is unscored: the results keep retrieval order and `reranked` is `false`.
