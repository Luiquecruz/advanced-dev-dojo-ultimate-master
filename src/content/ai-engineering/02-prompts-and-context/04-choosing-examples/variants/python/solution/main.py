from dojo_ai import cosine_similarity, count_tokens, embed


def example_tokens(example):
    return count_tokens(example["input"]) + count_tokens(example["output"])


def select_examples(query, pool, *, k, max_tokens, min_similarity=0, duplicate_threshold=0.9):
    query_vector = embed(query)
    candidates = []
    for example in pool:
        vector = embed(example["input"])
        candidates.append({"example": example, "vector": vector, "score": cosine_similarity(query_vector, vector)})
    candidates.sort(key=lambda candidate: -candidate["score"])
    selected = []
    used_tokens = 0
    for candidate in candidates:
        if len(selected) >= k:
            break
        is_duplicate = any(cosine_similarity(chosen["vector"], candidate["vector"]) >= duplicate_threshold for chosen in selected)
        tokens = example_tokens(candidate["example"])
        if candidate["score"] < min_similarity or is_duplicate or used_tokens + tokens > max_tokens:
            continue
        used_tokens += tokens
        selected.append(candidate)
    return [{**candidate["example"], "score": candidate["score"]} for candidate in reversed(selected)]


def build_few_shot_messages(system, query, examples):
    messages = [{"role": "system", "content": system}]
    for example in examples:
        messages.append({"role": "user", "content": example["input"]})
        messages.append({"role": "assistant", "content": example["output"]})
    messages.append({"role": "user", "content": query})
    return messages


def normalize_label(text, labels):
    candidate = text.strip().lower().removesuffix(".")
    return candidate if candidate in labels else None


async def classify_with_examples(model, *, system, query, pool, labels, **selection):
    examples = select_examples(query, pool, **selection)
    response = await model.generate({"messages": build_few_shot_messages(system, query, examples)})
    return {"label": normalize_label(response["text"], labels), "exampleIds": [example["id"] for example in examples]}
