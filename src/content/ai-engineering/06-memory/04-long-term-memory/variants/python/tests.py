from datetime import datetime, timezone

from dojo_ai import cosine_similarity, create_model, embed

HOUR = 3_600_000
START = int(datetime(2026, 10, 1, 9, 0, 0, tzinfo=timezone.utc).timestamp() * 1000)
CONVERSATION = "user: I always book aisle seats, and I am allergic to peanuts.\nassistant: Noted.\nuser: What is the weather in Lisbon today?"


class Clock:
    def __init__(self, start=START):
        self.time = start

    def now(self):
        return self.time

    def advance(self, hours):
        self.time += hours * HOUR
        return self.time


def store(**extra):
    clock = Clock()
    return clock, mod.create_memory_store(now=clock.now, **extra)


def ids(results):
    return [result["memory"]["id"] for result in results]


def contains(record, expected):
    return all(key in record and record[key] == value for key, value in expected.items())


@test("extract_candidates asks for JSON with the conversation and keeps only well-formed candidates, stripped")
async def _():
    fake_model.reply(
        respond.json({
            "memories": [
                {"text": "  The user always books aisle seats.  ", "importance": 6},
                {"text": "The user is allergic to peanuts.", "importance": 9},
                {"text": "Asked about the weather", "importance": 0},
                {"text": "Too important", "importance": 11},
                {"text": "Half a point", "importance": 2.5},
                {"text": "String importance", "importance": "7"},
                {"text": "   ", "importance": 5},
                {"importance": 5},
                "The user likes Lisbon",
            ],
        }),
    )
    candidates = await mod.extract_candidates(create_model(), CONVERSATION)
    assert candidates == [
        {"text": "The user always books aisle seats.", "importance": 6},
        {"text": "The user is allergic to peanuts.", "importance": 9},
    ]
    request = fake_model.requests[0]
    assert request.get("responseFormat", {}).get("type") == "json"
    assert CONVERSATION in "\n".join(message["content"] for message in request["messages"])


@test("extract_candidates returns no candidates for refusals and every malformed shape, and lets provider errors through")
async def _():
    async def scenario():
        fake_model.reply(respond.one_of([
            respond.malformed_json({"memories": [{"text": "The user is allergic to peanuts.", "importance": 9}]}),
            respond.refusal(),
            respond.json(["not", "an", "object"]),
            respond.json({"memories": "none"}),
        ]))
        assert await mod.extract_candidates(create_model(), CONVERSATION) == []

    await for_each_seed(16, scenario)
    fake_model.reset().reply(respond.error(503))
    error = await capture_error(mod.extract_candidates(create_model(), CONVERSATION))
    assert error.status == 503


@test("is_worth_storing keeps important statements and skips trivia, fragments and questions")
def _():
    assert mod.is_worth_storing({"text": "The user is allergic to peanuts.", "importance": 9}) is True
    assert mod.is_worth_storing({"text": "The user prefers window seats.", "importance": 3}) is True
    assert mod.is_worth_storing({"text": "The user said thanks.", "importance": 2}) is False
    assert mod.is_worth_storing({"text": "Peanut allergy", "importance": 9}) is False
    assert mod.is_worth_storing({"text": "Does the user like trains?", "importance": 6}) is False
    assert mod.is_worth_storing({"text": "The user prefers window seats.", "importance": 4}, 5) is False


@test("write skips what is not worth storing, merges near-duplicates into the existing memory and adds new facts")
def _():
    clock, memory = store()
    first = memory.write({"text": "The user prefers dark mode in the editor", "importance": 4})
    assert first["action"] == "added"
    assert contains(first["memory"], {"text": "The user prefers dark mode in the editor", "importance": 4, "createdAt": START, "lastAccessedAt": START})
    assert first["memory"]["embedding"] == embed("The user prefers dark mode in the editor")

    clock.advance(5)
    merged = memory.write({"text": "User prefers the dark mode editor", "importance": 7})
    assert merged["action"] == "merged"
    assert contains(merged["memory"], {"id": first["memory"]["id"], "text": "User prefers the dark mode editor", "importance": 7, "createdAt": START, "lastAccessedAt": START + 5 * HOUR})
    assert memory.write({"text": "The user prefers dark mode in the editor", "importance": 3})["memory"]["importance"] == 7

    assert memory.write({"text": "The user is allergic to peanuts", "importance": 9})["action"] == "added"
    assert memory.write({"text": "ok thanks", "importance": 1}) == {"action": "skipped"}
    assert len(memory.all()) == 2
    assert len({entry["id"] for entry in memory.all()}) == 2


@test("the duplicate threshold decides between merging and adding")
def _():
    near = ["The user prefers dark mode in the editor", "The user prefers dark mode in the code editor"]
    similarity = cosine_similarity(embed(near[0]), embed(near[1]))
    loose = store(duplicate_threshold=similarity - 0.01)[1]
    strict = store(duplicate_threshold=similarity + 0.01)[1]
    for memory in [loose, strict]:
        memory.write({"text": near[0], "importance": 5})
        memory.write({"text": near[1], "importance": 5})
    assert len(loose.all()) == 1
    assert len(strict.all()) == 2


@test("recency_score decays exponentially per hour since the last access and never exceeds 1")
def _():
    for decay in [0.5, 0.9, 0.995]:
        assert mod.recency_score(START, START, decay) == 1
        assert mod.recency_score(START, START + 10 * HOUR, decay) == approx(decay ** 10, abs=1e-9)
        assert mod.recency_score(START, START + 1.5 * HOUR, decay) == approx(decay ** 1.5, abs=1e-9)
        assert mod.recency_score(START + HOUR, START, decay) == 1
        for first, second in [(2, 3), (0.5, 7), (24, 48)]:
            combined = mod.recency_score(START, START + (first + second) * HOUR, decay)
            product = mod.recency_score(START, START + first * HOUR, decay) * mod.recency_score(START, START + second * HOUR, decay)
            assert combined == approx(product, abs=1e-9)
            assert combined < mod.recency_score(START, START + first * HOUR, decay)


@test("retrieve scores relevance, recency and importance with the configured weights, best first, within the limit")
def _():
    facts = [
        {"text": "The user is allergic to peanuts", "importance": 9, "hoursLater": 0},
        {"text": "The user prefers vegan restaurants", "importance": 5, "hoursLater": 30},
        {"text": "The user lives in Lisbon near the river", "importance": 4, "hoursLater": 60},
        {"text": "The user prefers aisle seats on flights", "importance": 6, "hoursLater": 90},
    ]
    query = "Which restaurant should I book? The user prefers vegan food."
    scenarios = [
        ({"relevance": 1, "recency": 0, "importance": 0}, 0.99),
        ({"relevance": 0, "recency": 1, "importance": 0}, 0.99),
        ({"relevance": 0, "recency": 0, "importance": 1}, 0.99),
        ({"relevance": 2, "recency": 0.5, "importance": 1}, 0.95),
    ]
    orders = []
    for weights, decay_per_hour in scenarios:
        clock, memory = store(weights=weights, decay_per_hour=decay_per_hour)
        elapsed = 0
        for fact in facts:
            clock.advance(fact["hoursLater"] - elapsed)
            elapsed = fact["hoursLater"]
            memory.write({"text": fact["text"], "importance": fact["importance"]})
        clock.advance(10)
        results = memory.retrieve(query, 3)
        assert len(results) == 3
        for result in results:
            fact = next(entry for entry in facts if entry["text"] == result["memory"]["text"])
            assert result["relevance"] == approx(max(0, cosine_similarity(embed(query), embed(fact["text"]))), abs=1e-9)
            assert result["recency"] == approx(decay_per_hour ** (100 - fact["hoursLater"]), abs=1e-9)
            assert result["importance"] == approx(fact["importance"] / 10, abs=1e-9)
            expected_score = weights["relevance"] * result["relevance"] + weights["recency"] * result["recency"] + weights["importance"] * result["importance"]
            assert result["score"] == approx(expected_score, abs=1e-9)
        for index in range(1, len(results)):
            assert results[index]["score"] <= results[index - 1]["score"]
        orders.append([result["memory"]["text"] for result in results])
    assert orders[0][0] == "The user prefers vegan restaurants"
    assert orders[1] == ["The user prefers aisle seats on flights", "The user lives in Lisbon near the river", "The user prefers vegan restaurants"]
    assert orders[2] == ["The user is allergic to peanuts", "The user prefers aisle seats on flights", "The user prefers vegan restaurants"]


@test("retrieving a memory refreshes its last access, so it outranks an untouched memory later")
def _():
    clock, memory = store(weights={"relevance": 0, "recency": 1, "importance": 0})
    peanuts = memory.write({"text": "The user is allergic to peanuts", "importance": 8})["memory"]
    seats = memory.write({"text": "The user prefers aisle seats on flights", "importance": 8})["memory"]
    clock.advance(20)
    retrieved = memory.retrieve("peanuts allergy", 1)
    assert ids(retrieved) == [peanuts["id"]]
    assert retrieved[0]["recency"] == approx(0.995 ** 20, abs=1e-9)
    stored = {entry["id"]: entry for entry in memory.all()}
    assert stored[peanuts["id"]]["lastAccessedAt"] == START + 20 * HOUR
    assert stored[seats["id"]]["lastAccessedAt"] == START
    clock.advance(30)
    later = memory.retrieve("anything", 2)
    assert ids(later) == [peanuts["id"], seats["id"]]
    assert later[0]["recency"] == approx(0.995 ** 30, abs=1e-9)
    assert later[1]["recency"] == approx(0.995 ** 50, abs=1e-9)
