Select few-shot examples per request from a labeled pool: rank by similarity to the input, skip weak matches and near-duplicates, stay within a count and a token budget, and put the most similar example closest to the question.

An **example** is `{ id, input, output }`. Use `embed` and `cosineSimilarity` from `@dojo/ai` for similarity and `countTokens` for size. The size of an example is `countTokens(input) + countTokens(output)` (exported as `exampleTokens`).

## 1. `selectExamples(query, pool, options)`

`options` is `{ k, maxTokens, minSimilarity, duplicateThreshold }`; `minSimilarity` defaults to `0` and `duplicateThreshold` to `0.9`.

1. Score every example: `cosineSimilarity(embed(query), embed(example.input))`.
2. Rank by score, highest first; equal scores keep their pool order.
3. Walk the ranking and take a candidate unless:
   - its score is below `minSimilarity`;
   - the cosine similarity between its input embedding and the input embedding of an example already taken is at least `duplicateThreshold`;
   - adding its size would make the total size of the taken examples exceed `maxTokens` (skip it and keep looking: a smaller one may still fit).
4. Stop when `k` examples are taken or the ranking ends.
5. Return the taken examples as `{ id, input, output, score }` in **reverse** order of selection, so the most similar comes last.

## 2. `buildFewShotMessages(system, query, examples)`

Return a system message with `system`, then for each example, in the given order, a user message with its `input` and an assistant message with its `output`, then a user message with the `query`.

## 3. `normalizeLabel(text, labels)`

Trim, lowercase and remove one trailing period. Return the result when it is one of `labels`, otherwise `null`.

## 4. `classifyWithExamples(model, request)`

`request` holds `system`, `query`, `pool`, `labels` and the selection options. Select examples, call `model.generate` once with `buildFewShotMessages(system, query, selected)`, and return `{ label, exampleIds }`: the normalized label (or `null`) and the ids of the examples sent, in message order.

The tests check rankings, budgets and deduplication against the deterministic embedding, the messages sent, and label handling across phrasings.
