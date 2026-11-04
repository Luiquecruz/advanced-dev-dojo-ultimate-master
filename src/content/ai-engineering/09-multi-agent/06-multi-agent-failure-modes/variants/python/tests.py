import json

from dojo_ai import create_model


def user_of(request):
    return next(message["content"] for message in request["messages"] if message["role"] == "user")


def system_of(request):
    return next(message["content"] for message in request["messages"] if message["role"] == "system")


def response(text, finish_reason="stop"):
    return {"id": "r", "model": "dojo-fake-1", "text": text, "toolCalls": [], "finishReason": finish_reason, "usage": {"inputTokens": 1, "outputTokens": 1, "totalTokens": 2, "cost": 0}}


def claims(*items):
    return json.dumps({"claims": [{"text": text, "sourceId": source_id} for text, source_id in items]}, separators=(",", ":"))


TASKS = [
    {"id": "pricing", "instruction": "Summarize Beacon pricing.", "sourceIds": ["s1", "s2"]},
    {"id": "retention", "instruction": "Summarize Beacon retention.", "sourceIds": ["s3"]},
]
VOTERS = ["Ada", "Grace", "Linus"]
QUESTION = "Is the Beacon contract compliant with our 90-day retention policy? Answer yes or no."


class CountingModel:
    """Delegates to a model and records the peak number of calls in flight."""

    def __init__(self, model):
        self.model = model
        self.active = 0
        self.peak = 0

    async def generate(self, request):
        self.active += 1
        self.peak = max(self.peak, self.active)
        try:
            return await self.model.generate(request)
        finally:
            self.active -= 1


@test("validate_worker_output accepts only complete JSON whose claims cite allowed sources")
def _():
    assert mod.validate_worker_output(response(claims(["$0.30 per GB", "s1"], ["volume discounts", "s2"])), ["s1", "s2"]) == {
        "ok": True,
        "claims": [
            {"text": "$0.30 per GB", "sourceId": "s1"},
            {"text": "volume discounts", "sourceId": "s2"},
        ],
    }
    invalid = [
        (response(claims(["$0.30 per GB", "s1"]), "length"), "length"),
        (response('{"claims": [{"text": "x", '), "JSON"),
        (response('{"claims": []}'), "claims"),
        (response('{"findings": "x"}'), "claims"),
        (response("null"), "claims"),
        (response(claims(["$0.30 per GB", "s1"], ["free tier forever", "s9"])), "s9"),
        (response(claims(["  ", "s1"])), "text"),
    ]
    for output, mention in invalid:
        result = mod.validate_worker_output(output, ["s1", "s2"])
        assert result["ok"] is False, mention
        assert len(result["problems"]) > 0, mention
        assert mention in " ".join(result["problems"]), mention


@test("gather_claims retries an invalid worker with feedback and quarantines what still fails, so bad claims never spread")
async def _():
    fake_model.reply(
        respond.json({"claims": [{"text": "Beacon costs $0.30 per GB", "sourceId": "s1"}, {"text": "Beacon is free for startups", "sourceId": "s7"}]}),
        respond.json({"claims": [{"text": "Beacon costs $0.30 per GB", "sourceId": "s1"}]}),
        respond.malformed_json({"claims": []}),
        respond.error(503),
    )
    result = await mod.gather_claims(TASKS, model=create_model(), max_attempts=2)
    assert result["accepted"] == [{"text": "Beacon costs $0.30 per GB", "sourceId": "s1", "taskId": "pricing"}]
    assert len(result["quarantined"]) == 1
    assert result["quarantined"][0]["taskId"] == "retention"
    assert "overloaded" in " ".join(result["quarantined"][0]["problems"])
    assert len(fake_model.requests) == 4
    first = fake_model.requests[0]
    assert system_of(first) == mod.WORKER_SYSTEM
    assert first["responseFormat"] == {"type": "json"}
    assert TASKS[0]["instruction"] in user_of(first)
    for source_id in ["s1", "s2"]:
        assert source_id in user_of(first), source_id
    assert "s7" in user_of(fake_model.requests[1])
    assert TASKS[1]["instruction"] in user_of(fake_model.requests[2])


@test("accepted claims always cite their own task sources, across every mix of worker failures")
async def _():
    def handler(request, context):
        allowed = "s1" if "pricing" in user_of(request) else "s3"
        return respond.one_of([
            respond.json({"claims": [{"text": "grounded claim", "sourceId": allowed}]}),
            respond.json({"claims": [{"text": "invented claim", "sourceId": "s9"}]}),
            respond.malformed_json({"claims": [{"text": "grounded claim", "sourceId": allowed}]}),
            respond.truncated(json.dumps({"claims": [{"text": "grounded claim", "sourceId": allowed}]}, separators=(",", ":"))),
            respond.error(500),
        ])

    async def scenario():
        fake_model.handle(handler)
        result = await mod.gather_claims(TASKS, model=create_model(), max_attempts=3)
        sources = {task["id"]: task["sourceIds"] for task in TASKS}
        for claim in result["accepted"]:
            assert claim["sourceId"] in sources[claim["taskId"]]
        settled = [*dict.fromkeys(claim["taskId"] for claim in result["accepted"]), *(entry["taskId"] for entry in result["quarantined"])]
        assert sorted(settled) == ["pricing", "retention"]
        for entry in result["quarantined"]:
            assert len(entry["problems"]) > 0
        assert len(fake_model.requests) <= 6

    await for_each_seed(20, scenario)


@test("first-round votes are cast in parallel, each blind to the others, and a quorum decides")
async def _():
    counting = CountingModel(create_model())
    fake_model.reply(respond.slow(5, respond.json({"answer": " No "})), respond.slow(5, respond.json({"answer": "no"})), respond.slow(5, respond.json({"answer": "yes"})))
    result = await mod.vote_independently(QUESTION, model=counting, voters=VOTERS, quorum=0.6)
    assert result == {"status": "consensus", "decision": "no", "rounds": 1, "ballots": [["no", "no", "yes"]]}
    assert counting.peak == 3
    assert len(fake_model.requests) == 3
    for index, request in enumerate(fake_model.requests):
        assert request["messages"] == [
            {"role": "system", "content": mod.voter_system(VOTERS[index])},
            {"role": "user", "content": QUESTION},
        ]
        assert request["responseFormat"] == {"type": "json"}
    assert "Ada" in mod.voter_system("Ada")


@test("without a quorum, a discussion round shares the anonymous first-round answers; abstentions count against the quorum")
async def _():
    fake_model.reply(
        respond.json({"answer": "yes"}),
        respond.json({"answer": "no"}),
        respond.refusal(),
        respond.json({"answer": "no"}),
        respond.json({"answer": "No"}),
        respond.json({"answer": "yes"}),
    )
    result = await mod.vote_independently(QUESTION, model=create_model(), voters=VOTERS, quorum=0.6)
    assert result == {"status": "consensus", "decision": "no", "rounds": 2, "ballots": [["yes", "no", None], ["no", "no", "yes"]]}
    assert len(fake_model.requests) == 6
    for index, request in enumerate(fake_model.requests[3:]):
        content = user_of(request)
        assert system_of(request) == mod.voter_system(VOTERS[index])
        assert QUESTION in content
        assert "yes" in content
        assert "no" in content
        for voter in VOTERS:
            assert voter not in content, voter

    fake_model.reset().reply(respond.json({"answer": "yes"}), respond.error(500), respond.json({"answer": "no"}), respond.json({"answer": "yes"}), respond.refusal(), respond.json({"answer": "no"}))
    split = await mod.vote_independently(QUESTION, model=create_model(), voters=VOTERS, quorum=0.6)
    assert split == {"status": "no_consensus", "decision": None, "rounds": 2, "ballots": [["yes", None, "no"], ["yes", None, "no"]]}


@test("voting keeps its invariants across seeds")
async def _():
    voters = ["Ada", "Grace", "Linus", "Margaret", "Alan"]

    async def scenario():
        fake_model.handle(lambda request, context: respond.one_of([respond.json({"answer": "yes"}), respond.json({"answer": "No"}), respond.malformed_json({"answer": "no"}), respond.error(503)]))
        result = await mod.vote_independently(QUESTION, model=create_model(), voters=voters, quorum=0.6)
        assert len(fake_model.requests) == len(voters) * result["rounds"]
        assert len(result["ballots"]) == result["rounds"]
        for request in fake_model.requests[:len(voters)]:
            assert user_of(request) == QUESTION
        last = result["ballots"][result["rounds"] - 1]
        if result["status"] == "consensus":
            assert last.count(result["decision"]) / len(voters) >= 0.6
        else:
            assert result["decision"] is None
        if result["rounds"] == 2:
            counts = [result["ballots"][0].count(answer) for answer in ["yes", "no"]]
            assert max(counts) / len(voters) < 0.6

    await for_each_seed(20, scenario)


@test("the delegation guard blocks cycles, depth, fan-out and total delegations, in that order")
def _():
    guard = mod.create_delegation_guard(max_depth=2, max_fan_out=2, max_total=4)
    assert guard.request(["lead"], "pricing") == {"allowed": True}
    assert guard.request(["lead", "pricing"], "lead") == {"allowed": False, "reason": "cycle"}
    assert guard.request(["lead", "pricing"], "fx-rates") == {"allowed": True}
    assert guard.request(["lead", "pricing", "fx-rates"], "bank-api") == {"allowed": False, "reason": "depth"}
    assert guard.request(["lead", "pricing", "fx-rates"], "pricing") == {"allowed": False, "reason": "cycle"}
    assert guard.request(["lead"], "retention") == {"allowed": True}
    assert guard.request(["lead"], "support") == {"allowed": False, "reason": "fan_out"}
    assert guard.request(["lead", "retention"], "archive") == {"allowed": True}
    assert guard.request(["lead", "retention"], "legal") == {"allowed": False, "reason": "total"}
    assert guard.total == 4
    fresh = mod.create_delegation_guard(max_depth=1, max_fan_out=5, max_total=5)
    assert fresh.request(["lead"], "worker") == {"allowed": True}
    assert fresh.request(["lead", "worker"], "helper") == {"allowed": False, "reason": "depth"}
    assert fresh.total == 1
