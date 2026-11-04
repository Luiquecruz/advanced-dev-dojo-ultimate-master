import re

from dojo_ai import ModelError, create_model

ORDER_ID_TASK = {"system": "You write regular expressions. Answer with the pattern only.", "prompt": "Write a pattern for order ids such as ORD-2026-000123."}
ORDER_ID_EXAMPLES = {"should_match": ["ORD-2026-000123", "ORD-1999-999999"], "should_reject": ["ord-2026-000123", "ORD-2026-123", "ORD-2026-000123x", "XORD-2026-000123"]}
GOOD_PATTERN = r"ORD-\d{4}-\d{6}"
BAD_PATTERNS = [r"ORD-(\d{4}", "ORD-.*", r"[Oo][Rr][Dd]-\d{4}-\d{6}", r"ORD-\d+-\d+"]


def last_user_message(request):
    return next(message for message in reversed(request["messages"]) if message["role"] == "user")["content"]


def type_name(value):
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if value is None:
        return "null"
    return "object"


class ListingSchema:
    """Validates {"title": str of at most 60 characters, "price": positive number, "tags": list of str}, shaped like a Zod safe_parse."""

    def safe_parse(self, value):
        if not isinstance(value, dict):
            return {"success": False, "issues": [{"path": [], "message": f"Invalid input: expected object, received {type_name(value)}"}]}
        issues = []
        title = value.get("title")
        if not isinstance(title, str):
            issues.append({"path": ["title"], "message": f"Invalid input: expected string, received {type_name(title)}"})
        elif len(title) > 60:
            issues.append({"path": ["title"], "message": "Too big: expected string to have <=60 characters"})
        price = value.get("price")
        if type_name(price) != "number":
            issues.append({"path": ["price"], "message": f"Invalid input: expected number, received {type_name(price)}"})
        elif price <= 0:
            issues.append({"path": ["price"], "message": "Too small: expected number to be >0"})
        tags = value.get("tags")
        if not isinstance(tags, list):
            issues.append({"path": ["tags"], "message": f"Invalid input: expected array, received {type_name(tags)}"})
        else:
            for index, tag in enumerate(tags):
                if not isinstance(tag, str):
                    issues.append({"path": ["tags", index], "message": f"Invalid input: expected string, received {type_name(tag)}"})
        return {"success": True, "data": value} if not issues else {"success": False, "issues": issues}


class Spy:
    """Records every call and delegates to the implementation."""

    def __init__(self, implementation):
        self.implementation = implementation
        self.calls = []

    def __call__(self, *arguments):
        self.calls.append(list(arguments))
        return self.implementation(*arguments)


@test("passes on the first attempt with the system and user messages, running every verifier once")
async def _():
    fake_model.reply(respond.text(GOOD_PATTERN))
    syntax = mod.Verifier("syntax", Spy(lambda output: {"passed": True}))
    result = await mod.run_verified(create_model(), ORDER_ID_TASK, verifiers=[syntax, mod.examples_verifier(**ORDER_ID_EXAMPLES)], max_attempts=3)
    assert result == {"status": "passed", "output": GOOD_PATTERN, "attempts": 1, "failures": []}
    assert fake_model.requests[0]["messages"] == [
        {"role": "system", "content": ORDER_ID_TASK["system"]},
        {"role": "user", "content": ORDER_ID_TASK["prompt"]},
    ]
    assert len(syntax.check.calls) == 1

    fake_model.reset().reply(respond.text(GOOD_PATTERN))
    await mod.run_verified(create_model(), {"prompt": "Pattern only."}, verifiers=[], max_attempts=1)
    assert fake_model.requests[0]["messages"] == [{"role": "user", "content": "Pattern only."}]


@test("feeds the failing verifier and its feedback back with the previous answer, then passes")
async def _():
    fake_model.reply(respond.text("ORD-.*"), respond.text(GOOD_PATTERN))
    result = await mod.run_verified(create_model(), ORDER_ID_TASK, verifiers=[mod.examples_verifier(**ORDER_ID_EXAMPLES)], max_attempts=3)
    assert result["status"] == "passed"
    assert result["attempts"] == 2
    assert result["output"] == GOOD_PATTERN
    assert len(result["failures"]) == 1
    assert result["failures"][0]["attempt"] == 1
    assert result["failures"][0]["verifier"] == "examples"
    assert '"ORD-2026-123"' in result["failures"][0]["feedback"]

    retry = fake_model.requests[1]["messages"]
    assert retry[:3] == [
        {"role": "system", "content": ORDER_ID_TASK["system"]},
        {"role": "user", "content": ORDER_ID_TASK["prompt"]},
        {"role": "assistant", "content": "ORD-.*"},
    ]
    assert len(retry) == 4
    assert retry[3]["role"] == "user"
    assert "examples" in retry[3]["content"]
    assert result["failures"][0]["feedback"] in retry[3]["content"]


@test("runs verifiers from first to last and stops at the first failure")
async def _():
    async def failing_suite(output):
        return {"passed": False, "feedback": "2 of 14 tests fail: totals.test.ts"}

    cheap = mod.Verifier("parses", Spy(lambda output: {"passed": output.startswith("{")}))
    expensive = mod.Verifier("test-suite", Spy(failing_suite))
    fake_model.reply(respond.text("Sure! Here is the JSON:"), respond.text('{"total": 3}'))
    result = await mod.run_verified(create_model(), {"prompt": "Fix the totals."}, verifiers=[cheap, expensive], max_attempts=2)
    assert result["status"] == "failed"
    assert result["failures"] == [
        {"attempt": 1, "verifier": "parses", "feedback": ""},
        {"attempt": 2, "verifier": "test-suite", "feedback": "2 of 14 tests fail: totals.test.ts"},
    ]
    assert len(cheap.check.calls) == 2
    assert len(expensive.check.calls) == 1
    assert "parses" in last_user_message(fake_model.requests[1])


@test("stops after max_attempts when the model never fixes the problem, and reports every failure")
async def _():
    fake_model.handle(lambda request, context: respond.text("ORD-.*"))
    result = await mod.run_verified(create_model(), ORDER_ID_TASK, verifiers=[mod.examples_verifier(**ORDER_ID_EXAMPLES)], max_attempts=3)
    assert result["status"] == "failed"
    assert result["attempts"] == 3
    assert result["output"] == "ORD-.*"
    assert [[failure["attempt"], failure["verifier"]] for failure in result["failures"]] == [[1, "examples"], [2, "examples"], [3, "examples"]]
    assert len(fake_model.requests) == 3
    assert len([message for message in fake_model.requests[2]["messages"] if message["role"] == "assistant"]) == 2


@test("treats truncated and refused answers as incomplete without running the verifiers")
async def _():
    verifier = mod.Verifier("examples", Spy(lambda output: {"passed": True}))
    fake_model.reply(respond.truncated(r"ORD-\d{4}-\d{6} matches every order id because", 0.3), respond.refusal(), respond.text(GOOD_PATTERN))
    result = await mod.run_verified(create_model(), ORDER_ID_TASK, verifiers=[verifier], max_attempts=3)
    assert result["status"] == "passed"
    assert result["attempts"] == 3
    assert [failure["verifier"] for failure in result["failures"]] == ["completion", "completion"]
    assert "length" in result["failures"][0]["feedback"]
    assert "refusal" in result["failures"][1]["feedback"]
    assert len(verifier.check.calls) == 1


@test("converges within the attempt budget however many bad answers come first, driven by feedback")
async def _():
    async def scenario():
        state = {}

        def behavior(request, context):
            if "bad_answers" not in state:
                state["bad_answers"] = int(context.random() * 4)
            previous_answers = len([message for message in request["messages"] if message["role"] == "assistant"])
            if previous_answers < state["bad_answers"]:
                return respond.one_of([respond.text(pattern) for pattern in BAD_PATTERNS])
            return respond.text(GOOD_PATTERN)

        fake_model.handle(behavior)
        result = await mod.run_verified(create_model(), ORDER_ID_TASK, verifiers=[mod.examples_verifier(**ORDER_ID_EXAMPLES)], max_attempts=5)
        bad_answers = state["bad_answers"]
        assert result["status"] == "passed"
        assert result["attempts"] == bad_answers + 1
        assert len(result["failures"]) == bad_answers
        assert len(fake_model.requests) == bad_answers + 1
        for failure in result["failures"]:
            assert len(failure["feedback"]) > 0
            assert failure["feedback"] in last_user_message(fake_model.requests[failure["attempt"]])

    await for_each_seed(16, scenario)


@test("a verifier that raises or a model error ends the run unchanged")
async def _():
    def crash(output):
        raise RuntimeError("test runner crashed")

    fake_model.reply(respond.text(GOOD_PATTERN), respond.text(GOOD_PATTERN))
    crashing = mod.Verifier("tests", crash)
    error = await capture_error(mod.run_verified(create_model(), ORDER_ID_TASK, verifiers=[crashing], max_attempts=3))
    assert isinstance(error, RuntimeError)
    assert str(error) == "test runner crashed"
    assert len(fake_model.requests) == 1

    fake_model.reset().reply(respond.text("ORD-.*"), respond.error(503))
    outage = await capture_error(mod.run_verified(create_model(), ORDER_ID_TASK, verifiers=[mod.examples_verifier(**ORDER_ID_EXAMPLES)], max_attempts=3))
    assert isinstance(outage, ModelError)
    assert outage.status == 503


@test("schema_verifier and examples_verifier explain every failure in lines a model can act on")
async def _():
    verifier = mod.schema_verifier(ListingSchema())
    assert verifier.name == "schema"
    assert verifier.check('{"title":"Desk lamp","price":39.9,"tags":["home"]}') == {"passed": True}
    not_json = verifier.check('Here you go: {"title": "Desk lamp"}')
    assert not_json["passed"] is False
    assert not_json["feedback"].startswith("Not valid JSON")
    invalid = verifier.check('{"title":"Desk lamp","price":-3,"tags":["home", 7]}')
    assert invalid["passed"] is False
    assert sorted(line.split(": ")[0] for line in invalid["feedback"].split("\n")) == ["price", "tags.1"]
    assert re.match(r"\(root\): ", verifier.check("[1, 2]")["feedback"])

    examples = mod.examples_verifier(should_match=["42", "7"], should_reject=["12a", ""])
    assert examples.name == "examples"
    assert examples.check(r" \d+ ") == {"passed": True}
    assert examples.check(r"\d+(")["feedback"].startswith("Not a valid regular expression")
    loose = examples.check(r"\d*[a-z]?")
    assert loose["passed"] is False
    assert len(loose["feedback"].split("\n")) == 2
    assert '"12a"' in loose["feedback"]
    assert '""' in loose["feedback"]
