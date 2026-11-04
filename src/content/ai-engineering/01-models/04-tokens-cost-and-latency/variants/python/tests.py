import math

from dojo_ai import count_tokens, create_model

PRICING = {"inputPerMillion": 2000, "outputPerMillion": 8000}
MARGIN = 0.2
QUESTION = [
    {"role": "system", "content": "You answer questions about orders in one sentence."},
    {"role": "user", "content": "Where is order 1042?"},
]
LONG_REPLY = "Order 1042 left the warehouse yesterday and is now with the carrier, " * 20


def worst_case(messages, max_tokens, safety_margin=MARGIN):
    input_tokens = math.ceil(count_tokens(messages) * (1 + safety_margin))
    return (input_tokens * PRICING["inputPerMillion"] + max_tokens * PRICING["outputPerMillion"]) / 1_000_000


def budgeted_client(**extra):
    options = {"model": create_model(), "pricing": PRICING, "max_request_cost": 1, "max_session_cost": 1, "safety_margin": MARGIN, **extra}
    return mod.create_budgeted_client(**options)


@test("estimate_cost counts input tokens locally, adds the safety margin rounded up and prices every allowed output token")
def _():
    plain = mod.estimate_cost(QUESTION, 200, PRICING)
    assert plain["inputTokens"] == count_tokens(QUESTION)
    assert plain["maxOutputTokens"] == 200
    assert plain["maxCost"] == approx(worst_case(QUESTION, 200, 0), abs=1e-9)
    padded = mod.estimate_cost(QUESTION, 200, PRICING, MARGIN)
    assert padded["inputTokens"] == math.ceil(count_tokens(QUESTION) * (1 + MARGIN))
    assert padded["maxCost"] == approx(worst_case(QUESTION, 200), abs=1e-9)


@test("when the provider counts 15% more tokens, only the estimate with a margin bounds the reported usage and cost of any reply")
async def _():
    async def scenario():
        fake_model.configure(pricing=PRICING, tokenizer_drift=0.15)
        fake_model.reply(respond.text(["In transit.", "It is with the carrier and arrives tomorrow.", LONG_REPLY]))
        result = await budgeted_client().send(QUESTION, 60)
        assert fake_model.requests[0]["maxTokens"] == 60
        assert result["usage"]["inputTokens"] > mod.estimate_cost(QUESTION, 60, PRICING)["inputTokens"]
        assert result["usage"]["inputTokens"] <= mod.estimate_cost(QUESTION, 60, PRICING, MARGIN)["inputTokens"]
        assert result["estimatedCost"] == approx(worst_case(QUESTION, 60), abs=1e-9)
        assert result["usage"]["cost"] <= result["estimatedCost"]

    await for_each_seed(10, scenario)


@test("refuses a request whose worst case exceeds the per-request limit before sending anything")
async def _():
    fake_model.configure(pricing=PRICING)
    client = budgeted_client(max_request_cost=worst_case(QUESTION, 120), max_session_cost=10)
    error = await capture_error(client.send(QUESTION, 150))
    assert isinstance(error, mod.BudgetExceededError)
    assert error.scope == "request"
    assert len(fake_model.requests) == 0
    assert client.report() == {"requests": 0, "inputTokens": 0, "outputTokens": 0, "cost": 0, "latenciesMs": []}
    await client.send(QUESTION, 100)
    assert len(fake_model.requests) == 1


@test("adds the actual cost of each call to the session and refuses the call that could exceed the session budget")
async def _():
    fake_model.configure(pricing=PRICING)
    fake_model.handle(lambda request, context: respond.text(LONG_REPLY))
    client = budgeted_client(max_session_cost=worst_case(QUESTION, 100) * 2.5)
    first = await client.send(QUESTION, 100)
    second = await client.send(QUESTION, 100)
    error = await capture_error(client.send(QUESTION, 100))
    assert isinstance(error, mod.BudgetExceededError)
    assert error.scope == "session"
    assert len(fake_model.requests) == 2
    smaller = await client.send(QUESTION, 10)
    assert len(fake_model.requests) == 3
    report = client.report()
    assert report["requests"] == 3
    assert report["inputTokens"] == first["usage"]["inputTokens"] + second["usage"]["inputTokens"] + smaller["usage"]["inputTokens"]
    assert report["outputTokens"] == first["usage"]["outputTokens"] + second["usage"]["outputTokens"] + smaller["usage"]["outputTokens"]
    assert report["cost"] == approx(first["usage"]["cost"] + second["usage"]["cost"] + smaller["usage"]["cost"], abs=1e-9)


@test("records the provider usage, not the estimate, so short replies leave budget for more calls")
async def _():
    fake_model.configure(pricing=PRICING)
    fake_model.handle(lambda request, context: respond.text("Shipped."))
    session_budget = worst_case(QUESTION, 100) * 2.5
    client = budgeted_client(max_session_cost=session_budget)
    for _call in range(4):
        await client.send(QUESTION, 100)
    report = client.report()
    assert report["requests"] == 4
    assert report["cost"] < session_budget
    assert report["outputTokens"] == 4 * count_tokens("Shipped.")


@test("measures each call with the injected clock and reports the latencies in order")
async def _():
    clock = {"time": 1_000}
    steps = [250, 40, 900]

    def advance(request, context):
        clock["time"] += steps[context.call_index]
        return respond.text("Delivered.")

    fake_model.handle(advance)
    client = budgeted_client(now=lambda: clock["time"])
    latencies = []
    for _call in range(3):
        latencies.append((await client.send(QUESTION, 50))["latencyMs"])
    assert latencies == steps
    assert client.report()["latenciesMs"] == steps
