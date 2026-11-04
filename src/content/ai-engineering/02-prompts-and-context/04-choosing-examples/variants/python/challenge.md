Select few-shot examples per request from a labeled pool: rank by similarity to the input, skip weak matches and near-duplicates, stay within a count and a token budget, and put the most similar example closest to the question.

An **example** is a dict `{"id": ..., "input": ..., "output": ...}`. Use `embed` and `cosine_similarity` from `dojo_ai` for similarity and `count_tokens` for size. The size of an example is `count_tokens(input) + count_tokens(output)` (already written as `example_tokens`). Messages are dicts `{"role": ..., "content": ...}`.

## 1. `select_examples(query, pool, *, k, max_tokens, min_similarity=0, duplicate_threshold=0.9)`

1. Score every example: `cosine_similarity(embed(query), embed(example["input"]))`.
2. Rank by score, highest first; equal scores keep their pool order.
3. Walk the ranking and take a candidate unless:
   - its score is below `min_similarity`;
   - the cosine similarity between its input embedding and the input embedding of an example already taken is at least `duplicate_threshold`;
   - adding its size would make the total size of the taken examples exceed `max_tokens` (skip it and keep looking: a smaller one may still fit).
4. Stop when `k` examples are taken or the ranking ends.
5. Return the taken examples as `{"id", "input", "output", "score"}` dicts in **reverse** order of selection, so the most similar comes last.

## 2. `build_few_shot_messages(system, query, examples)`

Return a system message with `system`, then for each example, in the given order, a user message with its `"input"` and an assistant message with its `"output"`, then a user message with the `query`.

## 3. `normalize_label(text, labels)`

Strip, lowercase and remove one trailing period. Return the result when it is one of `labels`, otherwise `None`.

## 4. `classify_with_examples(model, *, system, query, pool, labels, **selection)`

`selection` holds the keyword arguments of `select_examples` (`k`, `max_tokens`, ...). Select examples, await `model.generate(request)` once with `build_few_shot_messages(system, query, selected)` as `"messages"`, and return `{"label": ..., "exampleIds": [...]}`: the normalized label (or `None`) and the ids of the examples sent, in message order.

The tests check rankings, budgets and deduplication against the deterministic embedding, the messages sent, and label handling across phrasings.
