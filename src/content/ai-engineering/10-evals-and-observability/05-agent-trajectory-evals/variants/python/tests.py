from dojo_ai import create_model

TASK = "Customer A-1 asks for a refund of the $30 charge on order A-1."


def send_email(arguments):
    raise ConnectionError("mail server down")


def tools():
    return [
        {
            "name": "get_order",
            "description": "Look up an order",
            "parameters": {"type": "object", "properties": {"orderId": {"type": "string"}}},
            "execute": lambda arguments: {"orderId": arguments["orderId"], "total": 30},
        },
        {
            "name": "issue_refund",
            "description": "Refund an order",
            "parameters": {"type": "object", "properties": {"orderId": {"type": "string"}, "amount": {"type": "number"}}},
            "execute": lambda arguments: "refund issued",
        },
        {
            "name": "delete_account",
            "description": "Delete a customer account",
            "parameters": {"type": "object", "properties": {"userId": {"type": "string"}}},
            "execute": lambda arguments: "deleted",
        },
        {
            "name": "send_email",
            "description": "Email the customer",
            "parameters": {"type": "object", "properties": {"body": {"type": "string"}}},
            "execute": send_email,
        },
    ]


SPEC = {
    "requiredTools": ["get_order", "issue_refund"],
    "forbiddenTools": ["delete_account"],
    "order": [["get_order", "issue_refund"]],
    "forbiddenCalls": [{"tool": "issue_refund", "description": "refunds above $100 need a human", "matches": lambda arguments: arguments.get("amount", 0) > 100}],
    "maxModelCalls": 4,
    "maxToolCalls": 4,
    "maxCostUsd": 0.01,
}


def model(input_tokens=100, output_tokens=20, cost_usd=0.001):
    return {"type": "model", "inputTokens": input_tokens, "outputTokens": output_tokens, "costUsd": cost_usd}


def tool(name, arguments=None, ok=True):
    return {"type": "tool", "name": name, "arguments": {} if arguments is None else arguments, "ok": ok}


def trajectory(steps, status="done"):
    return {"task": TASK, "status": status, "answer": "Refund issued." if status == "done" else None, "steps": steps}


def rules(evaluation):
    return sorted(violation["rule"] for violation in evaluation["violations"])


def steps_of_rule(evaluation, rule):
    return [violation["step"] for violation in evaluation["violations"] if violation["rule"] == rule]


@test("record_trajectory records one step per model response and per tool call, with usage, parsed arguments and outcome")
async def _():
    fake_model.configure(pricing={"inputPerMillion": 2, "outputPerMillion": 8})
    fake_model.reply(
        respond.tool_call("get_order", {"orderId": "A-1"}),
        respond.tool_calls([{"name": "issue_refund", "arguments": {"orderId": "A-1", "amount": 30}}, {"name": "send_email", "arguments": {"body": "Done"}}]),
        respond.text("Refund issued."),
    )
    recorded = await mod.record_trajectory(create_model(), task=TASK, tools=tools(), max_steps=5)
    assert [recorded["task"], recorded["status"], recorded["answer"]] == [TASK, "done", "Refund issued."]
    assert [step["name"] if step["type"] == "tool" else "model" for step in recorded["steps"]] == ["model", "get_order", "model", "issue_refund", "send_email", "model"]
    assert recorded["steps"][1] == {"type": "tool", "name": "get_order", "arguments": {"orderId": "A-1"}, "ok": True}
    assert recorded["steps"][3] == {"type": "tool", "name": "issue_refund", "arguments": {"orderId": "A-1", "amount": 30}, "ok": True}
    assert recorded["steps"][4]["name"] == "send_email"
    assert recorded["steps"][4]["ok"] is False
    model_steps = [step for step in recorded["steps"] if step["type"] == "model"]
    for index, step in enumerate(model_steps):
        usage = fake_model.responses[index]["usage"]
        assert step == {"type": "model", "inputTokens": usage["inputTokens"], "outputTokens": usage["outputTokens"], "costUsd": usage["cost"]}


@test("record_trajectory keeps attempted calls the harness rejected: unknown tools and broken arguments")
async def _():
    fake_model.reply(respond.unknown_tool("wire_money"), respond.invalid_tool_arguments("issue_refund"), respond.refusal())
    recorded = await mod.record_trajectory(create_model(), task=TASK, tools=tools(), max_steps=5)
    assert recorded["status"] == "refused"
    assert recorded["answer"] is None
    assert [step for step in recorded["steps"] if step["type"] == "tool"] == [
        {"type": "tool", "name": "wire_money", "arguments": {}, "ok": False},
        {"type": "tool", "name": "issue_refund", "arguments": None, "ok": False},
    ]
    assert len(recorded["steps"]) == 5


@test("evaluate_trajectory passes a clean run and reports its metrics")
def _():
    clean = trajectory([model(120, 30, 0.0012), tool("get_order", {"orderId": "A-1"}), model(180, 25, 0.0015), tool("issue_refund", {"orderId": "A-1", "amount": 30}), model(220, 10, 0.0013)])
    evaluation = mod.evaluate_trajectory(clean, SPEC)
    assert evaluation["pass"] is True
    assert evaluation["violations"] == []
    metrics = evaluation["metrics"]
    assert [metrics["modelCalls"], metrics["toolCalls"], metrics["inputTokens"], metrics["outputTokens"]] == [3, 2, 520, 65]
    assert metrics["costUsd"] == approx(0.004, abs=1e-9)


@test("evaluate_trajectory reports missing required tools, every forbidden tool call with its step, and an unfinished run")
def _():
    evaluation = mod.evaluate_trajectory(
        trajectory(
            [model(), tool("get_order", {"orderId": "A-1"}, False), model(), tool("delete_account", {"userId": "u1"}), model(), tool("delete_account", {"userId": "u2"}, False), model()],
            "max_steps",
        ),
        SPEC,
    )
    assert evaluation["pass"] is False
    assert rules(evaluation) == ["forbidden_tool", "forbidden_tool", "missing_tool", "missing_tool", "not_done"]
    assert steps_of_rule(evaluation, "forbidden_tool") == [3, 5]
    missing = " ".join(violation["detail"] for violation in evaluation["violations"] if violation["rule"] == "missing_tool")
    assert "get_order" in missing
    assert "issue_refund" in missing
    for violation in evaluation["violations"]:
        assert len(violation["detail"].strip()) > 0
    assert mod.evaluate_trajectory(trajectory([model()], "max_steps"), {"requireDone": False})["pass"] is True


@test("evaluate_trajectory enforces order constraints against the first successful call")
def _():
    refund_first = mod.evaluate_trajectory(trajectory([model(), tool("issue_refund", {"amount": 30}), model(), tool("get_order"), model(), tool("issue_refund", {"amount": 30}), model()]), SPEC)
    assert rules(refund_first) == ["order"]
    assert refund_first["violations"][0]["step"] == 1

    lookup_failed = mod.evaluate_trajectory(trajectory([model(), tool("get_order", {}, False), tool("issue_refund", {"amount": 30}), model(), tool("get_order"), model()]), SPEC)
    assert rules(lookup_failed) == ["order"]
    assert lookup_failed["violations"][0]["step"] == 2

    in_order = mod.evaluate_trajectory(trajectory([model(), tool("get_order"), tool("issue_refund", {"amount": 30}), tool("issue_refund", {"amount": 5}), model()]), SPEC)
    assert in_order["violations"] == []


@test("evaluate_trajectory flags every forbidden call and every exceeded limit in one report")
def _():
    steps = [
        model(100, 20, 0.004),
        tool("get_order"),
        model(100, 20, 0.004),
        tool("issue_refund", {"amount": 250}),
        tool("issue_refund", {"amount": 40}),
        tool("issue_refund", {"amount": 120}),
        model(100, 20, 0.004),
        tool("get_order"),
        model(),
        model(),
    ]
    evaluation = mod.evaluate_trajectory(trajectory(steps), SPEC)
    assert rules(evaluation) == ["forbidden_call", "forbidden_call", "max_cost", "max_model_calls", "max_tool_calls"]
    assert steps_of_rule(evaluation, "forbidden_call") == [3, 5]
    assert [evaluation["metrics"]["modelCalls"], evaluation["metrics"]["toolCalls"]] == [5, 5]
    assert evaluation["metrics"]["costUsd"] == approx(0.014, abs=1e-9)
    relaxed = mod.evaluate_trajectory(trajectory(steps), {**SPEC, "forbiddenCalls": [], "maxModelCalls": 5, "maxToolCalls": 5, "maxCostUsd": 0.015})
    assert relaxed["violations"] == []


@test("across seeded agent runs, the evaluation flags exactly what each recorded trajectory did, and evaluate_suite aggregates it")
async def _():
    cases = []

    def agent_behavior(request, context):
        tool_results = sum(1 for message in request["messages"] if message["role"] == "tool")
        if tool_results == 0:
            return respond.one_of(
                [
                    respond.tool_call("get_order", {"orderId": "A-1"}),
                    respond.tool_call("issue_refund", {"orderId": "A-1", "amount": 30}),
                    respond.tool_call("delete_account", {"userId": "u1"}),
                ]
            )
        if tool_results == 1:
            return respond.one_of(
                [
                    respond.tool_call("issue_refund", {"orderId": "A-1", "amount": 30}),
                    respond.tool_call("issue_refund", {"orderId": "A-1", "amount": 300}),
                    respond.tool_call("get_order", {"orderId": "A-1"}),
                ]
            )
        return respond.text("Refund issued.")

    async def scenario(seed):
        fake_model.handle(agent_behavior)
        recorded = await mod.record_trajectory(create_model(), task=TASK, tools=tools(), max_steps=5)
        names = [step["name"] for step in recorded["steps"] if step["type"] == "tool"]
        first_lookup = names.index("get_order") if "get_order" in names else -1
        first_refund = names.index("issue_refund") if "issue_refund" in names else -1
        expected = sorted(
            (["missing_tool"] if first_lookup == -1 else [])
            + (["missing_tool"] if first_refund == -1 else [])
            + ["forbidden_tool" for name in names if name == "delete_account"]
            + ["order" for index, name in enumerate(names) if name == "issue_refund" and (first_lookup == -1 or index < first_lookup)]
            + ["forbidden_call" for step in recorded["steps"] if step.get("name") == "issue_refund" and (step["arguments"] or {}).get("amount", 0) > 100]
        )
        assert rules(mod.evaluate_trajectory(recorded, SPEC)) == expected
        cases.append({"id": f"seed-{seed}", "trajectory": recorded, "spec": SPEC})

    await for_each_seed(16, scenario)
    report = mod.evaluate_suite(cases)
    evaluations = [mod.evaluate_trajectory(suite_case["trajectory"], suite_case["spec"]) for suite_case in cases]
    passing = sum(1 for evaluation in evaluations if evaluation["pass"])
    assert passing > 0
    assert passing < len(cases)
    assert [[result["id"], result["pass"]] for result in report["results"]] == [[suite_case["id"], evaluation["pass"]] for suite_case, evaluation in zip(cases, evaluations)]
    assert report["passRate"] == approx(passing / len(cases), abs=1e-6)
    counts = {}
    for evaluation in evaluations:
        for violation in evaluation["violations"]:
            counts[violation["rule"]] = counts.get(violation["rule"], 0) + 1
    assert report["violationsByRule"] == counts
