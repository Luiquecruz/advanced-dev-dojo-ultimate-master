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


async def extract_candidates(model, conversation):
    # TODO: ask for JSON, then keep only items with a non-empty text and an integer importance from 1 to 10; [] for refusals and malformed JSON
    response = await model.generate({"messages": [{"role": "system", "content": EXTRACTION_PROMPT}, {"role": "user", "content": conversation}]})
    return json.loads(response["text"])["memories"]


def is_worth_storing(candidate, min_importance=3):
    # TODO: importance at least min_importance, at least three words, not a question
    return True


def recency_score(last_accessed_at, now, decay_per_hour):
    # TODO: decay_per_hour raised to the hours since last_accessed_at (never more than 1)
    return 1


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
        # TODO: skip what is not worth storing, merge into the most similar memory at or above duplicate_threshold, otherwise add
        moment = self.now()
        self.created += 1
        memory = {
            "id": f"memory-{self.created}",
            "text": candidate["text"],
            "importance": candidate["importance"],
            "embedding": embed(candidate["text"]),
            "createdAt": moment,
            "lastAccessedAt": moment,
        }
        self.memories.append(memory)
        return {"action": "added", "memory": copy_memory(memory)}

    def retrieve(self, query, limit=5):
        # TODO: score = weighted relevance + recency + importance / 10, best first, and mark the returned memories as accessed now
        query_embedding = embed(query)
        scored = []
        for memory in self.memories:
            relevance = cosine_similarity(query_embedding, memory["embedding"])
            scored.append({"memory": copy_memory(memory), "score": relevance, "relevance": relevance, "recency": 1, "importance": memory["importance"] / 10})
        return sorted(scored, key=lambda entry: entry["score"], reverse=True)[:limit]

    def all(self):
        return [copy_memory(memory) for memory in self.memories]


def create_memory_store(now=current_time_ms, min_importance=3, duplicate_threshold=0.9, decay_per_hour=0.995, weights=None):
    return MemoryStore(now, min_importance, duplicate_threshold, decay_per_hour, weights)
