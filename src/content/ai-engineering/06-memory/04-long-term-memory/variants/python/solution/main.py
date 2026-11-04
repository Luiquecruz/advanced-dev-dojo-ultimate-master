import json
import time

from dojo_ai import cosine_similarity, embed

HOUR_MS = 3_600_000

EXTRACTION_PROMPT = (
    "Extract facts about the user worth remembering in future conversations: stable preferences, personal facts, commitments. "
    'Skip small talk and one-off requests. Answer only with JSON: {"memories":[{"text":"...","importance":1-10}]}.'
)

DEFAULT_WEIGHTS = {"relevance": 1, "recency": 1, "importance": 1}


def current_time_ms():
    return time.time() * 1000


def is_candidate(item):
    if not isinstance(item, dict):
        return False
    text = item.get("text")
    importance = item.get("importance")
    return (
        isinstance(text, str)
        and text.strip() != ""
        and isinstance(importance, int)
        and not isinstance(importance, bool)
        and 1 <= importance <= 10
    )


async def extract_candidates(model, conversation):
    response = await model.generate({
        "messages": [
            {"role": "system", "content": EXTRACTION_PROMPT},
            {"role": "user", "content": conversation},
        ],
        "responseFormat": {"type": "json"},
    })
    if response["finishReason"] != "stop":
        return []
    try:
        parsed = json.loads(response["text"])
    except ValueError:
        return []
    memories = parsed.get("memories") if isinstance(parsed, dict) else None
    if not isinstance(memories, list):
        return []
    return [{"text": item["text"].strip(), "importance": item["importance"]} for item in memories if is_candidate(item)]


def is_worth_storing(candidate, min_importance=3):
    text = candidate["text"].strip()
    return candidate["importance"] >= min_importance and len(text.split()) >= 3 and not text.endswith("?")


def recency_score(last_accessed_at, now, decay_per_hour):
    return decay_per_hour ** (max(0, now - last_accessed_at) / HOUR_MS)


def copy_memory(memory):
    return {**memory, "embedding": list(memory["embedding"])}


class MemoryStore:
    """Long-term memories with a write policy, near-duplicate merging and weighted retrieval."""

    def __init__(self, now=current_time_ms, min_importance=3, duplicate_threshold=0.9, decay_per_hour=0.995, weights=None):
        self.now = now
        self.min_importance = min_importance
        self.duplicate_threshold = duplicate_threshold
        self.decay_per_hour = decay_per_hour
        self.weights = weights or DEFAULT_WEIGHTS
        self.memories = []
        self.created = 0

    def write(self, candidate):
        if not is_worth_storing(candidate, self.min_importance):
            return {"action": "skipped"}
        text = candidate["text"].strip()
        embedding = embed(text)
        moment = self.now()
        duplicate = None
        best_similarity = float("-inf")
        for memory in self.memories:
            similarity = cosine_similarity(embedding, memory["embedding"])
            if similarity > best_similarity:
                best_similarity = similarity
                duplicate = memory
        if duplicate is not None and best_similarity >= self.duplicate_threshold:
            duplicate["text"] = text
            duplicate["embedding"] = embedding
            duplicate["importance"] = max(duplicate["importance"], candidate["importance"])
            duplicate["lastAccessedAt"] = moment
            return {"action": "merged", "memory": copy_memory(duplicate)}
        self.created += 1
        memory = {
            "id": f"memory-{self.created}",
            "text": text,
            "importance": candidate["importance"],
            "embedding": embedding,
            "createdAt": moment,
            "lastAccessedAt": moment,
        }
        self.memories.append(memory)
        return {"action": "added", "memory": copy_memory(memory)}

    def retrieve(self, query, limit=5):
        query_embedding = embed(query)
        moment = self.now()
        scored = []
        for memory in self.memories:
            relevance = max(0, cosine_similarity(query_embedding, memory["embedding"]))
            recency = recency_score(memory["lastAccessedAt"], moment, self.decay_per_hour)
            importance = memory["importance"] / 10
            score = self.weights["relevance"] * relevance + self.weights["recency"] * recency + self.weights["importance"] * importance
            scored.append({"memory": memory, "score": score, "relevance": relevance, "recency": recency, "importance": importance})
        ranked = sorted(scored, key=lambda entry: entry["score"], reverse=True)[:limit]
        results = [{**entry, "memory": copy_memory(entry["memory"])} for entry in ranked]
        for entry in ranked:
            entry["memory"]["lastAccessedAt"] = moment
        return results

    def all(self):
        return [copy_memory(memory) for memory in self.memories]


def create_memory_store(now=current_time_ms, min_importance=3, duplicate_threshold=0.9, decay_per_hour=0.995, weights=None):
    return MemoryStore(now, min_importance, duplicate_threshold, decay_per_hour, weights)
