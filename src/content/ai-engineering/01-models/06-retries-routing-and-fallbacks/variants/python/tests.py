import json

from dojo_ai import ModelError, create_model

REQUEST = {"messages": [{"role": "user", "content": "Classify this ticket: my invoice shows the wrong VAT number."}]}


class RecordingSleep:
    """A sleep that returns at once and records every delay it was asked to wait."""

    def __init__(self):
        self.calls = []

    async def __call__(self, milliseconds):
        self.calls.append(milliseconds)


def retry_options(**extra):
    return mod.RetryOptions(**{"retries": 3, "base_ms": 100, "max_ms": 1000, "sleep": RecordingSleep(), "random": lambda: 0.5, **extra})


def is_category_json(text):
    try:
        return isinstance(json.loads(text).get("category"), str)
    except (ValueError, AttributeError):
        return False


def router_options(**extra):
    models = {"cheap": create_model("cheap"), "strong": create_model("strong"), "backup": create_model("backup")}
    return mod.RouterOptions(**{"retries": 3, "base_ms": 100, "max_ms": 1000, "sleep": RecordingSleep(), "random": lambda: 0.5, "models": models, "validate": is_category_json, **extra})


def called_models():
    return [request["model"] for request in fake_model.requests]


@test("is_retryable accepts rate limits, server errors, overloads and timeouts, but never a context-length error, an auth error or a bug")
async def _():
    for status in [429, 500, 503, 504, 529]:
        fake_model.reply(respond.error(status))
        error = await capture_error(create_model().generate(REQUEST))
        assert mod.is_retryable(error) is True
    fake_model.reply(respond.context_length(), respond.error(401))
    too_long = await capture_error(create_model().generate(REQUEST))
    assert too_long.code == "context_length"
    assert mod.is_retryable(too_long) is False
    unauthorized = await capture_error(create_model().generate(REQUEST))
    assert mod.is_retryable(unauthorized) is False
    assert mod.is_retryable(Exception("bug")) is False
    assert mod.is_retryable(TypeError("x is None")) is False


@test("retry_delay honors retry_after_ms and otherwise uses capped exponential backoff with full jitter")
def _():
    server_error = ModelError(500, "server_error", "oops")

    def delays(random):
        options = mod.RetryOptions(retries=5, base_ms=100, max_ms=1000, random=random)
        return [mod.retry_delay(attempt, server_error, options) for attempt in range(6)]

    assert delays(lambda: 1) == [100, 200, 400, 800, 1000, 1000]
    assert delays(lambda: 0.5) == [50, 100, 200, 400, 500, 500]
    rate_limited = ModelError(429, "rate_limit", "slow down", 2500)
    assert mod.retry_delay(0, rate_limited, mod.RetryOptions(retries=3, base_ms=100, max_ms=1000, random=lambda: 0.5)) == 2500
    assert mod.retry_delay(4, rate_limited, mod.RetryOptions(retries=3, base_ms=100, max_ms=1000, random=lambda: 1)) == 2500


@test("generate_with_retry survives every failure order within the limit, waits the right delays and raises the last error after it")
async def _():
    scenarios = [
        {"failures": [respond.error(429, retry_after_ms=700)], "sleeps": [700]},
        {"failures": [respond.error(500), respond.error(529)], "sleeps": [50, 100]},
        {"failures": [respond.error(504), respond.error(429, retry_after_ms=30), respond.error(503)], "sleeps": [50, 30, 200]},
    ]
    for scenario in scenarios:
        fake_model.reset().reply(*scenario["failures"], respond.text("billing"))
        options = retry_options()
        response = await mod.generate_with_retry(create_model(), REQUEST, options)
        assert response["text"] == "billing"
        assert len(fake_model.requests) == len(scenario["failures"]) + 1
        assert options.sleep.calls == scenario["sleeps"]
    fake_model.reset().reply(respond.error(503), respond.error(500), respond.error(503), respond.error(504, message="last failure"), respond.text("too late"))
    error = await capture_error(mod.generate_with_retry(create_model(), REQUEST, retry_options()))
    assert str(error) == "last failure"
    assert len(fake_model.requests) == 4


@test("generate_with_fallback switches to the backup only after the primary exhausts its retries, never on a context-length error")
async def _():
    fake_model.for_model("primary").reply(respond.error(503), respond.error(503), respond.error(503))
    fake_model.for_model("backup").reply(respond.text("billing"))
    result = await mod.generate_with_fallback(create_model("primary"), create_model("backup"), REQUEST, retry_options(retries=2))
    assert result["model"] == "backup"
    assert result["response"]["text"] == "billing"
    assert called_models() == ["primary", "primary", "primary", "backup"]

    fake_model.reset().for_model("primary").reply(respond.context_length())
    fake_model.for_model("backup").reply(respond.text("should not be called"))
    options = retry_options()
    error = await capture_error(mod.generate_with_fallback(create_model("primary"), create_model("backup"), REQUEST, options))
    assert error.code == "context_length"
    assert called_models() == ["primary"]
    assert options.sleep.calls == []


@test("answer routes to the cheap model first and escalates to the strong model only when the cheap answer fails validation")
async def _():
    escalations = []

    async def scenario():
        fake_model.for_model("cheap").reply(
            respond.one_of([respond.json({"category": "billing"}), respond.malformed_json({"category": "billing"}), respond.text(["Billing", "The category is billing."])])
        )
        fake_model.for_model("strong").reply(respond.json({"category": "billing"}))
        result = await mod.answer(REQUEST, router_options())
        cheap_answer_valid = is_category_json(fake_model.responses[0]["text"])
        assert is_category_json(result["text"])
        if cheap_answer_valid:
            assert called_models() == ["cheap"]
            assert result == {"text": fake_model.responses[0]["text"], "model": "cheap", "escalated": False}
        else:
            escalations.append(True)
            assert called_models() == ["cheap", "strong"]
            assert result == {"text": fake_model.responses[1]["text"], "model": "strong", "escalated": True}

    await for_each_seed(24, scenario)
    assert 0 < len(escalations) < 24


@test("answer escalates when the cheap model is down, uses the backup when the strong model is down too, and rejects an escalated answer that fails validation")
async def _():
    fake_model.for_model("cheap").reply(respond.error(503), respond.error(503))
    fake_model.for_model("strong").reply(respond.error(529), respond.error(529))
    fake_model.for_model("backup").reply(respond.json({"category": "shipping"}))
    result = await mod.answer(REQUEST, router_options(retries=1))
    assert result == {"text": '{"category":"shipping"}', "model": "backup", "escalated": True}
    assert called_models() == ["cheap", "cheap", "strong", "strong", "backup"]

    async def scenario():
        fake_model.for_model("cheap").reply(respond.malformed_json({"category": "billing"}))
        fake_model.for_model("strong").reply(respond.malformed_json({"category": "billing"}))
        error = await capture_error(mod.answer(REQUEST, router_options()))
        assert isinstance(error, mod.InvalidAnswerError)
        assert called_models() == ["cheap", "strong"]

    await for_each_seed(8, scenario)
