import json

from dojo_ai import ModelError, create_model

TICKET = {
    "type": "object",
    "properties": {
        "category": {"enum": ["billing", "shipping", "account", "bug"]},
        "priority": {"enum": ["low", "normal", "high"]},
        "orderId": {"type": ["string", "null"], "pattern": r"^\d{4}$"},
        "tags": {"type": "array", "items": {"type": "string"}, "default": []},
    },
    "required": ["category", "priority", "orderId"],
}

EXTRACTED = {"category": "billing", "priority": "high", "orderId": "1042", "tags": ["double charge"]}
EXTRACTED_JSON = json.dumps(EXTRACTED, separators=(",", ":"))
MESSAGES = [
    {"role": "system", "content": "Extract the ticket fields as JSON."},
    {"role": "user", "content": "I was charged twice for order 1042, please fix it today."},
]


def compact_json(value):
    return json.dumps(value, separators=(",", ":"))


def extract(**extra):
    return mod.generate_structured(create_model(), **{"messages": MESSAGES, "schema": TICKET, **extra})


@test("parse_model_json repairs prose and fences, trailing commas and single quotes, and rejects truncated JSON")
async def _():
    assert mod.parse_model_json('{"total": 3}') == {"ok": True, "value": {"total": 3}, "repaired": False}
    assert mod.parse_model_json('Here you go:\n```json\n{"total": 3,}\n```') == {"ok": True, "value": {"total": 3}, "repaired": True}
    truncated_seen = []

    async def scenario():
        fake_model.reply(respond.malformed_json(EXTRACTED))
        text = (await create_model().generate({"messages": MESSAGES}))["text"]
        result = mod.parse_model_json(text)
        if len(text) < len(EXTRACTED_JSON):
            truncated_seen.append(text)
            assert result["ok"] is False
            assert isinstance(result["error"], str)
        else:
            assert result == {"ok": True, "value": EXTRACTED, "repaired": True}

    await for_each_seed(24, scenario)
    assert len(truncated_seen) > 0


@test("asks for JSON with the JSON Schema and returns the validated value with defaults applied")
async def _():
    fake_model.reply(respond.text(compact_json({"category": "shipping", "priority": "normal", "orderId": None})))
    result = await extract()
    assert result == {"value": {"category": "shipping", "priority": "normal", "orderId": None, "tags": []}, "attempts": 1, "repaired": False}
    request = fake_model.requests[0]
    assert request["messages"] == MESSAGES
    assert request["responseFormat"]["type"] == "json"
    assert request["responseFormat"]["schema"]["type"] == "object"
    assert sorted(request["responseFormat"]["schema"]["properties"]) == ["category", "orderId", "priority", "tags"]


@test("survives every malformed shape: repairs without a second call, and re-asks only when the JSON cannot be repaired")
async def _():
    async def scenario():
        fake_model.reply(respond.malformed_json(EXTRACTED), respond.json(EXTRACTED))
        result = await extract()
        assert result["value"] == EXTRACTED
        first_text = fake_model.responses[0]["text"]
        if len(first_text) < len(EXTRACTED_JSON):
            assert result["attempts"] == 2
            assert len(fake_model.requests) == 2
        else:
            assert result == {"value": EXTRACTED, "attempts": 1, "repaired": True}
            assert len(fake_model.requests) == 1

    await for_each_seed(24, scenario)


@test("re-asks with the bad reply and the validation error, naming the invalid fields, without changing the original messages")
async def _():
    wrong = {"category": "billing", "priority": "urgent", "orderId": 1042}
    fake_model.reply(respond.json(wrong), respond.json(EXTRACTED))
    result = await extract()
    assert result["attempts"] == 2
    assert result["value"] == EXTRACTED
    second = fake_model.requests[1]["messages"]
    assert len(second) == len(MESSAGES) + 2
    assert second[: len(MESSAGES)] == MESSAGES
    assert second[len(MESSAGES)] == {"role": "assistant", "content": compact_json(wrong)}
    feedback = second[len(MESSAGES) + 1]
    assert feedback["role"] == "user"
    assert "priority" in feedback["content"]
    assert "orderId" in feedback["content"]
    assert fake_model.requests[0]["messages"] == MESSAGES
    assert len(MESSAGES) == 2


@test("treats a reply cut by the token limit as a failed attempt and re-asks")
async def _():
    fake_model.reply(respond.truncated(EXTRACTED_JSON, 0.95), respond.json(EXTRACTED))
    result = await extract()
    assert result["attempts"] == 2
    assert fake_model.requests[1]["messages"][-1]["role"] == "user"


@test("gives up after max_attempts calls with the last error, whatever mix of failures the model produces")
async def _():
    async def scenario():
        bad = respond.one_of([
            respond.malformed_json(EXTRACTED),
            respond.json({"category": "other"}),
            respond.text("I think it is billing."),
            respond.truncated(EXTRACTED_JSON),
        ])
        fake_model.handle(lambda request, context: bad)
        try:
            outcome = {"value": await extract(max_attempts=4)}
        except Exception as error:
            outcome = {"error": error}
        if "value" in outcome:
            assert outcome["value"]["value"] == EXTRACTED
            assert len(fake_model.requests) <= 4
        else:
            error = outcome["error"]
            assert isinstance(error, mod.StructuredOutputError)
            assert error.reason == "exhausted"
            assert error.attempts == 4
            assert len(error.last_error) > 0
            assert len(fake_model.requests) == 4

    await for_each_seed(12, scenario)
    fake_model.reset().handle(lambda request, context: respond.json({"category": "other"}))
    error = await capture_error(extract(max_attempts=2))
    assert error.reason == "exhausted"
    assert "category" in error.last_error
    assert len(fake_model.requests) == 2


@test("stops at once on a refusal or a content filter, and lets model errors through unchanged")
async def _():
    for behavior in [respond.refusal(), respond.content_filter()]:
        fake_model.reset().reply(behavior, respond.json(EXTRACTED))
        error = await capture_error(extract())
        assert isinstance(error, mod.StructuredOutputError)
        assert error.reason == "refusal"
        assert len(fake_model.requests) == 1
    fake_model.reset().reply(respond.error(503), respond.json(EXTRACTED))
    error = await capture_error(extract())
    assert isinstance(error, ModelError)
    assert error.status == 503
