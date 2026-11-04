import json

from dojo_ai import create_model

ROUTES = {
    "billing": {"description": "invoices, refunds and payments", "system": "You are the billing specialist."},
    "technical": {"description": "bugs, crashes and errors", "system": "You are the technical support engineer."},
    "general": {"description": "anything else", "system": "You are a friendly general assistant."},
}


def parse(text):
    try:
        return json.loads(text)
    except ValueError:
        return None


def field_of(value, key):
    return value.get(key) if isinstance(value, dict) else None


def last_user_content(request):
    return next((message["content"] for message in reversed(request["messages"]) if message["role"] == "user"), "")


def is_json_request(request):
    return request.get("responseFormat", {}).get("type") == "json"


@test("prompt_chain feeds each output into the next prompt and returns every output")
async def _():
    fake_model.reply(respond.text("facts: order 42 late"), respond.text("draft: sorry about order 42"), respond.text("final: sorry about order 42, refund issued"))
    steps = [
        {"name": "extract", "prompt": lambda previous: f"Extract facts from: {previous}"},
        {"name": "draft", "prompt": lambda previous: f"Draft a reply using: {previous}"},
        {"name": "polish", "prompt": lambda previous: f"Polish: {previous}"},
    ]
    result = await mod.prompt_chain(create_model(), "My order 42 is late", steps)
    prompts = [request["messages"][0]["content"] for request in fake_model.requests]
    assert prompts == [
        "Extract facts from: My order 42 is late",
        "Draft a reply using: facts: order 42 late",
        "Polish: draft: sorry about order 42",
    ]
    assert result == {
        "output": "final: sorry about order 42, refund issued",
        "outputs": ["facts: order 42 late", "draft: sorry about order 42", "final: sorry about order 42, refund issued"],
    }


@test("prompt_chain stops at a failed gate or at a reply that did not finish normally, without calling later steps")
async def _():
    steps = [
        {"name": "outline", "prompt": lambda previous: f"Outline: {previous}", "gate": lambda output: "1." in output},
        {"name": "write", "prompt": lambda previous: f"Write: {previous}"},
    ]
    fake_model.reply(respond.text("no numbered outline here"), respond.text("should not be requested"))
    gate_error = await capture_error(mod.prompt_chain(create_model(), "agents", steps))
    assert isinstance(gate_error, mod.GateError)
    assert gate_error.step == "outline"
    assert gate_error.output == "no numbered outline here"
    assert len(fake_model.requests) == 1

    async def scenario():
        fake_model.reply(
            respond.one_of([respond.truncated("1. Intro 2. Body 3. Conclusion", 0.4), respond.refusal(), respond.content_filter()]),
            respond.text("should not be requested"),
        )
        error = await capture_error(mod.prompt_chain(create_model(), "agents", steps))
        assert isinstance(error, mod.GateError)
        assert error.step == "outline"
        assert len(fake_model.requests) == 1

    await for_each_seed(9, scenario)


@test("route classifies with a JSON request listing every route and falls back on any unusable classification")
async def _():
    fallbacks = {"used": 0, "skipped": 0}

    async def scenario():
        fake_model.reply(
            respond.one_of([
                respond.json({"route": "billing"}),
                respond.json({"route": "technical"}),
                respond.json({"route": "legal"}),
                respond.json({"destination": "billing"}),
                respond.malformed_json({"route": "technical"}),
                respond.refusal(),
            ]),
            respond.text(["Here is how we can help.", "Thanks for reaching out."]),
        )
        result = await mod.route(create_model(), "The app crashes when I export my invoice", ROUTES, "general")
        classification = fake_model.requests[0]
        assert is_json_request(classification)
        classification_text = "\n".join(message["content"] for message in classification["messages"])
        for name in ROUTES:
            assert name in classification_text, name
        proposed = field_of(parse(fake_model.responses[0]["text"]), "route")
        expected = proposed if isinstance(proposed, str) and proposed in ROUTES else "general"
        fallbacks["skipped" if expected == proposed else "used"] += 1
        assert result["route"] == expected
        assert len(fake_model.requests) == 2
        assert fake_model.requests[1]["messages"][0] == {"role": "system", "content": ROUTES[expected]["system"]}
        assert last_user_content(fake_model.requests[1]) == "The app crashes when I export my invoice"
        assert result["text"] == fake_model.responses[1]["text"]

    await for_each_seed(24, scenario)
    assert fallbacks["used"] > 0
    assert fallbacks["skipped"] > 0


@test("parallel_sections sends every section at once and maps each answer to its section name")
async def _():
    fake_model.configure(latency_ms=5)
    finished_when_requested = []

    def handler(request, context):
        finished_when_requested.append(len(fake_model.responses))
        return respond.text(f"answer for {request['messages'][0]['content']}")

    fake_model.handle(handler)
    sections = [
        {"name": "summary", "instruction": "Summarize the contract."},
        {"name": "risks", "instruction": "List the risky clauses."},
        {"name": "deadlines", "instruction": "List every deadline."},
    ]
    result = await mod.parallel_sections(create_model(), "CONTRACT TEXT", sections)
    assert finished_when_requested == [0, 0, 0]
    assert result == {
        "summary": "answer for Summarize the contract.",
        "risks": "answer for List the risky clauses.",
        "deadlines": "answer for List every deadline.",
    }
    for request in fake_model.requests:
        assert last_user_content(request) == "CONTRACT TEXT"


@test("vote asks every voter for JSON, normalizes labels, counts unusable ballots and failed calls as abstentions, and returns None on a tie")
async def _():
    ties = {"count": 0}

    async def scenario():
        fake_model.handle(lambda request, context: respond.one_of([
            respond.json({"label": "Spam"}),
            respond.json({"label": " spam "}),
            respond.json({"label": "ham"}),
            respond.json({"label": "HAM"}),
            respond.json({"verdict": "spam"}),
            respond.malformed_json({"label": "spam"}),
            respond.refusal(),
            respond.error(500),
        ]))
        result = await mod.vote(create_model(), "Is this message spam? WIN A FREE PHONE", 5)
        assert len(fake_model.requests) == 5
        for request in fake_model.requests:
            assert is_json_request(request)
        votes = {}
        for response in fake_model.responses:
            label = field_of(parse(response["text"]), "label")
            if isinstance(label, str):
                normalized = label.strip().lower()
                votes[normalized] = votes.get(normalized, 0) + 1
        counted = sum(votes.values())
        ranking = sorted(votes.items(), key=lambda entry: entry[1], reverse=True)
        verdict = ranking[0][0] if len(ranking) > 0 and (len(ranking) == 1 or ranking[0][1] > ranking[1][1]) else None
        if verdict is None:
            ties["count"] += 1
        assert result == {"verdict": verdict, "votes": votes, "abstentions": 5 - counted}

    await for_each_seed(30, scenario)
    assert ties["count"] > 0


def script_writer_and_critic(pass_when):
    drafts = 0

    def handler(request, context):
        nonlocal drafts
        if is_json_request(request):
            draft = last_user_content(request)
            if pass_when(draft):
                return respond.json({"pass": True, "feedback": "Good."})
            return respond.json({"pass": False, "feedback": f"Too vague after {drafts} drafts"})
        drafts += 1
        return respond.text(f"draft v{drafts}")

    fake_model.handle(handler)


@test("evaluator_optimizer alternates draft and JSON evaluation, sends the previous draft and feedback back, and stops when the evaluator passes")
async def _():
    script_writer_and_critic(lambda draft: "draft v3" in draft)
    result = await mod.evaluator_optimizer(create_model(), "Write a release note for version 2.0", 5)
    assert result == {"text": "draft v3", "rounds": 3, "accepted": True, "feedback": ["Too vague after 1 drafts", "Too vague after 2 drafts"]}
    kinds = [is_json_request(request) for request in fake_model.requests]
    assert kinds == [False, True, False, True, False, True]
    evaluation = fake_model.requests[1]
    assert "draft v1" in "\n".join(message["content"] for message in evaluation["messages"])
    revision = "\n".join(message["content"] for message in fake_model.requests[4]["messages"])
    assert "Write a release note for version 2.0" in revision
    assert "draft v2" in revision
    assert "Too vague after 2 drafts" in revision


@test("evaluator_optimizer stops after max_rounds with the last draft, treating an unparsable evaluation as a rejection")
async def _():
    script_writer_and_critic(lambda draft: False)
    rejected = await mod.evaluator_optimizer(create_model(), "Write a haiku about queues", 2)
    assert rejected["text"] == "draft v2"
    assert rejected["rounds"] == 2
    assert rejected["accepted"] is False
    assert len(rejected["feedback"]) == 2
    assert len(fake_model.requests) == 4

    async def scenario():
        drafts = 0

        def handler(request, context):
            nonlocal drafts
            if is_json_request(request):
                return respond.one_of([respond.malformed_json({"pass": True}), respond.json({"verdict": "pass"}), respond.json({"pass": "yes"})])
            drafts += 1
            return respond.text(f"draft v{drafts}")

        fake_model.handle(handler)
        result = await mod.evaluator_optimizer(create_model(), "Write a haiku about queues", 3)
        assert result["accepted"] is False
        assert result["rounds"] == 3
        assert result["text"] == "draft v3"
        assert len(result["feedback"]) == 3
        assert len(fake_model.requests) == 6

    await for_each_seed(8, scenario)
