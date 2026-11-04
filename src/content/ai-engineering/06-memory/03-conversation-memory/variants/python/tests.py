from dojo_ai import count_tokens, create_model

SYSTEM = "You are the support assistant of a bike rental shop. Answer briefly."
WORDS = ["booking", "helmet", "refund", "station", "battery", "invoice", "pickup", "weekend"]


def label(index):
    return f"[msg-{index:02d}]"


def message(index):
    words = [WORDS[(index + position) % len(WORDS)] for position in range(3 + (index * 7) % 9)]
    return {"role": "user" if index % 2 == 0 else "assistant", "content": f"{label(index)} {' '.join(words)}"}


def conversation(count):
    return [message(index) for index in range(count)]


def memory(**extra):
    options = {"max_tokens": 120, "keep_recent": 2, "summary_max_tokens": 80, **extra}
    return mod.create_conversation_memory(create_model(), SYSTEM, **options)


def summary_request_text(request):
    return "\n".join(entry["content"] for entry in request["messages"])


@test("build_context keeps the system prompt and the longest recent run of messages that fits the token budget")
def _():
    history = conversation(20)
    for max_tokens in [60, 90, 140, 200, 2000]:
        window = mod.build_context(system=SYSTEM, summary="", history=history, max_tokens=max_tokens, keep_recent=2)
        messages, overflow = window["messages"], window["overflow"]
        assert messages[0] == {"role": "system", "content": SYSTEM}
        kept = messages[1:]
        assert overflow + kept == history
        assert len(kept) >= 2
        assert count_tokens(messages) <= max_tokens
        if overflow:
            assert count_tokens([messages[0], overflow[-1], *kept]) > max_tokens


@test("build_context always keeps the latest keep_recent messages, even when they alone break the budget")
def _():
    history = conversation(10)
    window = mod.build_context(system=SYSTEM, summary="", history=history, max_tokens=10, keep_recent=3)
    assert window["messages"] == [{"role": "system", "content": SYSTEM}, *history[-3:]]
    assert window["overflow"] == history[:7]
    short = mod.build_context(system=SYSTEM, summary="", history=history[:2], max_tokens=10, keep_recent=5)
    assert short["messages"] == [{"role": "system", "content": SYSTEM}, *history[:2]]
    assert short["overflow"] == []


@test("build_context adds the running summary as a second system message and counts it against the budget")
def _():
    history = conversation(20)
    summary = "The customer booked two e-bikes for Saturday at the harbour station and asked about helmets."
    without = mod.build_context(system=SYSTEM, summary="", history=history, max_tokens=150, keep_recent=2)
    with_summary = mod.build_context(system=SYSTEM, summary=summary, history=history, max_tokens=150, keep_recent=2)
    assert with_summary["messages"][0] == {"role": "system", "content": SYSTEM}
    assert with_summary["messages"][1]["role"] == "system"
    assert with_summary["messages"][1]["content"].startswith(mod.SUMMARY_PREFIX)
    assert summary in with_summary["messages"][1]["content"]
    assert count_tokens(with_summary["messages"]) <= 150
    assert len(with_summary["overflow"]) > len(without["overflow"])


@test("summarize sends the previous summary and every folded message in one capped request and returns any successful phrasing")
async def _():
    folded = conversation(5)

    async def scenario():
        fake_model.reply(respond.text(["  The customer booked two bikes for Saturday.  ", "Booking: two bikes, Saturday, harbour station.", "Two bikes are booked for the weekend; a refund question is open."]))
        result = await mod.summarize(create_model(), "Earlier: the customer asked about prices.", folded, 80)
        assert len(fake_model.requests) == 1
        assert fake_model.requests[0]["maxTokens"] == 80
        sent = summary_request_text(fake_model.requests[0])
        assert "Earlier: the customer asked about prices." in sent
        for entry in folded:
            assert entry["content"] in sent
        assert result == fake_model.responses[0]["text"].strip()

    await for_each_seed(6, scenario)


@test("summarize returns None instead of raising for errors, refusals, filtered, truncated and empty replies")
async def _():
    failures = [
        respond.refusal(),
        respond.content_filter(),
        respond.truncated("The customer booked two bikes for Saturday at the harbour station and asked about helmets.", 0.3),
        respond.text("   "),
        respond.error(429, retry_after_ms=5),
        respond.error(500),
        respond.error(503),
    ]
    for failure in failures:
        fake_model.reset().reply(failure)
        assert await mod.summarize(create_model(), "", conversation(4)) is None


@test("compact folds exactly the overflow into the summary, calls no model when nothing overflows, and keeps the context within budget")
async def _():
    conversation_memory = memory()
    for entry in conversation(3):
        conversation_memory.add(entry)
    assert await conversation_memory.compact() == {"folded": 0, "summarized": False}
    assert len(fake_model.requests) == 0

    for entry in conversation(16)[3:]:
        conversation_memory.add(entry)
    overflow = mod.build_context(system=SYSTEM, summary="", history=conversation(16), max_tokens=120, keep_recent=2)["overflow"]
    fake_model.reply(respond.text("The customer booked bikes and asked about a refund."))
    assert await conversation_memory.compact() == {"folded": len(overflow), "summarized": True}
    state = conversation_memory.state()
    assert state["summary"] == "The customer booked bikes and asked about a refund."
    assert state["history"] == conversation(16)[len(overflow):]
    context = conversation_memory.context()
    assert count_tokens(context) <= 120
    assert state["summary"] in context[1]["content"]
    assert context[-1] == message(15)


@test("a failed summary loses no history: the window still fits the budget and the next compact folds everything that overflowed")
async def _():
    async def scenario():
        conversation_memory = memory()
        for entry in conversation(18):
            conversation_memory.add(entry)
        fake_model.reply(respond.one_of([respond.refusal(), respond.content_filter(), respond.error(500), respond.error(429), respond.truncated("A summary that is cut off before it ends properly.", 0.4)]))
        assert await conversation_memory.compact() == {"folded": 0, "summarized": False}
        assert conversation_memory.state() == {"summary": "", "history": conversation(18)}
        context = conversation_memory.context()
        assert count_tokens(context) <= 120
        assert context[-2:] == conversation(18)[-2:]

        fake_model.reply(respond.text("Recovered summary of the booking."))
        result = await conversation_memory.compact()
        assert result["summarized"] is True
        sent = summary_request_text(fake_model.requests[-1])
        for entry in conversation(18)[:result["folded"]]:
            assert entry["content"] in sent
        assert conversation_memory.state()["history"] == conversation(18)[result["folded"]:]

    await for_each_seed(10, scenario)


@test("over a long conversation every call fits the budget, keeps the latest turns and summarizes each message exactly once")
async def _():
    fake_model.handle(lambda request, context: respond.text(f"Running summary number {context.call_index + 1}."))
    conversation_memory = memory()
    history = conversation(40)
    for entry in history:
        conversation_memory.add(entry)
        await conversation_memory.compact()
        context = conversation_memory.context()
        assert count_tokens(context) <= 120
        assert context[-1] == entry
        assert context[0] == {"role": "system", "content": SYSTEM}
    requests = fake_model.requests
    assert len(requests) > 1
    remaining = conversation_memory.state()["history"]
    for index, entry in enumerate(history):
        times_summarized = len([request for request in requests if label(index) in summary_request_text(request)])
        still_in_history = any(kept["content"] == entry["content"] for kept in remaining)
        assert times_summarized + (1 if still_in_history else 0) == 1, label(index)
