import json
import math
import re

USABLE_FINISH_REASONS = {"stop", "length"}


def repair(text):
    return re.sub(r",\s*([}\]])", r"\1", text.replace("'", '"'))


def try_parse(text):
    try:
        return json.loads(text)
    except ValueError:
        return None


def parse_json_loosely(text):
    candidates = [text.strip()]
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fenced:
        candidates.append(fenced.group(1).strip())
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        candidates.append(text[first_brace:last_brace + 1])
    for candidate in candidates:
        parsed = try_parse(candidate)
        if parsed is None:
            parsed = try_parse(repair(candidate))
        if parsed is not None:
            return parsed
    return None


async def ask_json(model, system, user):
    try:
        response = await model.generate({
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "responseFormat": {"type": "json"},
        })
    except Exception:
        return None
    return parse_json_loosely(response["text"]) if response["finishReason"] in USABLE_FINISH_REASONS else None


async def generate_queries(model, question, *, count=3):
    parsed = await ask_json(
        model,
        f"Rewrite the user's question into {count} different search queries for a help center: use other words, expand abbreviations, split compound questions. Reply with JSON: {{\"queries\": [\"...\"]}}.",
        question,
    )
    rewrites = parsed.get("queries") if isinstance(parsed, dict) else None
    queries = [question]
    seen = {question.strip().lower()}
    for rewrite in rewrites if isinstance(rewrites, list) else []:
        if not isinstance(rewrite, str) or rewrite.strip() == "" or rewrite.strip().lower() in seen:
            continue
        seen.add(rewrite.strip().lower())
        queries.append(rewrite.strip())
    return queries[:count + 1]


async def hyde_query(model, question):
    try:
        response = await model.generate({
            "messages": [
                {"role": "system", "content": "Write a short passage, in the style of a help center article, that would answer the question. It is used only for search, so plausible details are fine."},
                {"role": "user", "content": question},
            ],
        })
    except Exception:
        return question
    passage = response["text"].strip()
    return f"{question}\n\n{passage}" if response["finishReason"] in USABLE_FINISH_REASONS and passage != "" else question


def is_valid_score(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and 0 <= value <= 10


async def rerank(model, query, candidates, *, top_k=None):
    if not candidates:
        return {"results": [], "reranked": False}
    listing = "\n".join(f"[{candidate['id']}] {candidate['text']}" for candidate in candidates)
    parsed = await ask_json(
        model,
        'Score how well each passage answers the query, from 0 (irrelevant) to 10 (answers it fully). Reply with JSON: {"scores": [{"id": "...", "score": 0}]}.',
        f"Query: {query}\n\nPassages:\n{listing}",
    )
    entries = parsed.get("scores") if isinstance(parsed, dict) else None
    known_ids = {candidate["id"] for candidate in candidates}
    scores = {}
    for entry in entries if isinstance(entries, list) else []:
        if not isinstance(entry, dict):
            continue
        candidate_id = entry.get("id")
        score = entry.get("score")
        if isinstance(candidate_id, str) and candidate_id in known_ids and candidate_id not in scores and is_valid_score(score):
            scores[candidate_id] = score
    scored = sorted((candidate for candidate in candidates if candidate["id"] in scores), key=lambda candidate: scores[candidate["id"]], reverse=True)
    unscored = [candidate for candidate in candidates if candidate["id"] not in scores]
    results = [{**candidate, "score": scores.get(candidate["id"])} for candidate in scored + unscored]
    return {"results": results[:top_k], "reranked": len(scores) > 0}
