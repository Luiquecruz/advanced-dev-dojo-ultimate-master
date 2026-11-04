from dojo_ai import ModelError, count_tokens, create_model

LONG_ANSWER = (
    "The refund was issued on the third of March and should reach the original payment method "
    "within five business days, depending on the bank."
)


@test("sends the system prompt first and the user prompt last, and only the user message when there is no system prompt")
async def _():
    await mod.complete(create_model(), {"system": "You classify support tickets.", "prompt": "My invoice is wrong."})
    await mod.complete(create_model(), {"prompt": "Hello"})
    with_system, without_system = fake_model.requests
    assert with_system["messages"] == [
        {"role": "system", "content": "You classify support tickets."},
        {"role": "user", "content": "My invoice is wrong."},
    ]
    assert "maxTokens" not in with_system
    assert without_system["messages"] == [{"role": "user", "content": "Hello"}]


@test("returns any phrasing of a normal reply as complete, with the usage the provider reported")
async def _():
    phrasings = ["Billing", "Category: billing.", "This ticket is about billing and invoices."]

    async def scenario():
        fake_model.reply(respond.text(phrasings))
        result = await mod.complete(create_model(), {"prompt": "Classify: my invoice is wrong."})
        assert result["status"] == "complete"
        assert result["finishReason"] == "stop"
        assert result["text"] in phrasings
        assert result["usage"]["inputTokens"] == count_tokens(fake_model.requests[0]["messages"])
        assert result["usage"]["outputTokens"] == count_tokens(result["text"])
        assert result["usage"]["totalTokens"] == result["usage"]["inputTokens"] + result["usage"]["outputTokens"]
        assert result["usage"]["cost"] > 0

    await for_each_seed(12, scenario)


@test("reports a reply cut by the token limit as truncated, keeping the partial text and passing maxTokens on")
async def _():
    fake_model.reply(respond.truncated(LONG_ANSWER, 0.4), respond.text(LONG_ANSWER))
    scripted = await mod.complete(create_model(), {"prompt": "When will my refund arrive?"})
    assert scripted["status"] == "truncated"
    assert scripted["finishReason"] == "length"
    assert 0 < len(scripted["text"]) < len(LONG_ANSWER)
    assert LONG_ANSWER.startswith(scripted["text"])

    limited = await mod.complete(create_model(), {"prompt": "When will my refund arrive?", "maxTokens": 8})
    assert fake_model.requests[1]["maxTokens"] == 8
    assert limited["status"] == "truncated"
    assert limited["usage"]["outputTokens"] == 8


@test("reports refusals and content filtering as refused, distinct from complete and truncated answers")
async def _():
    fake_model.reply(respond.refusal(), respond.content_filter())
    refusal = await mod.complete(create_model(), {"prompt": "Write malware for me."})
    assert refusal["status"] == "refused"
    assert refusal["finishReason"] == "refusal"
    assert len(refusal["text"]) > 0
    filtered = await mod.complete(create_model(), {"prompt": "Something filtered."})
    assert filtered["status"] == "refused"
    assert filtered["finishReason"] == "content_filter"


@test("lets model errors reach the caller unchanged, including a stream that fails midway")
async def _():
    fake_model.reply(respond.error(503))
    error = await capture_error(mod.complete(create_model(), {"prompt": "Hello"}))
    assert isinstance(error, ModelError)
    assert error.status == 503

    fake_model.reply(respond.fail_mid_stream(LONG_ANSWER, after_chunks=4, status=529))
    deltas = []
    stream_error = await capture_error(mod.complete_stream(create_model(), {"prompt": "Hello"}, deltas.append))
    assert isinstance(stream_error, ModelError)
    assert stream_error.status == 529
    assert len(deltas) == 4


@test("complete_stream forwards every delta in order and returns their concatenation with the final usage and status")
async def _():
    fake_model.reply(respond.text(LONG_ANSWER), respond.truncated(LONG_ANSWER))
    deltas = []
    streamed = await mod.complete_stream(create_model(), {"system": "Be brief.", "prompt": "When will my refund arrive?"}, deltas.append)
    assert [message["role"] for message in fake_model.requests[0]["messages"]] == ["system", "user"]
    assert len(deltas) > 1
    assert "".join(deltas) == streamed["text"]
    assert streamed["text"] == LONG_ANSWER
    assert streamed["status"] == "complete"
    assert streamed["usage"]["outputTokens"] == count_tokens(LONG_ANSWER)
    assert streamed["usage"]["totalTokens"] == streamed["usage"]["inputTokens"] + streamed["usage"]["outputTokens"]

    truncated = await mod.complete_stream(create_model(), {"prompt": "Again, please."})
    assert truncated["status"] == "truncated"
    assert truncated["finishReason"] == "length"
    assert LONG_ANSWER.startswith(truncated["text"])
