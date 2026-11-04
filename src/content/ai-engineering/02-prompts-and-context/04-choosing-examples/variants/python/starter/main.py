from dojo_ai import cosine_similarity, count_tokens, embed


def example_tokens(example):
    return count_tokens(example["input"]) + count_tokens(example["output"])


def select_examples(query, pool, *, k, max_tokens, min_similarity=0, duplicate_threshold=0.9):
    # TODO: score by cosine similarity of embeddings, skip weak matches, near-duplicates and examples over the token budget, return most similar last
    return [{**example, "score": 0} for example in pool[:k]]


def build_few_shot_messages(system, query, examples):
    # TODO: system message, one user/assistant pair per example, then the query
    return [{"role": "system", "content": system}, {"role": "user", "content": query}]


def normalize_label(text, labels):
    # TODO: strip, lowercase and drop one trailing period; return None for anything outside labels
    return text


async def classify_with_examples(model, *, system, query, pool, labels, **selection):
    # TODO: select examples, build the messages, call the model and normalize the label
    response = await model.generate({"messages": build_few_shot_messages(system, query, [])})
    return {"label": normalize_label(response["text"], labels), "exampleIds": []}
