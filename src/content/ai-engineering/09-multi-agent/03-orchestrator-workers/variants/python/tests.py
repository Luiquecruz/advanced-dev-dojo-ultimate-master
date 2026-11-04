import asyncio
import json

from dojo_ai import create_model

QUESTION = "Compare the vector databases Nimbus, Quill and Rook on pricing, hosting and filtering."
PLAN = {
    "subtasks": [
        {"id": "nimbus", "instruction": "Research Nimbus: pricing, hosting and filtering."},
        {"id": "quill", "instruction": "Research Quill: pricing, hosting and filtering."},
        {"id": "rook", "instruction": "Research Rook: pricing, hosting and filtering."},
    ],
}


def system_of(request):
    return next((message["content"] for message in request["messages"] if message["role"] == "system"), None)


def user_of(request):
    return next((message["content"] for message in request["messages"] if message["role"] == "user"), "")


def requests_with(system):
    return [request for request in fake_model.requests if system_of(request) == system]


def script_roles(plan=None, worker=None):
    planner_calls = 0

    def handler(request, context):
        nonlocal planner_calls
        system = system_of(request)
        if system == mod.PLANNER_SYSTEM:
            planner_calls += 1
            return plan(planner_calls) if plan else respond.json(PLAN)
        if system == mod.WORKER_SYSTEM:
            instruction = user_of(request)
            return worker(instruction) if worker else respond.text(f"Findings for: {instruction}")
        return respond.text("Synthesized comparison of the findings.")

    fake_model.handle(handler)


def sum_usage():
    responses = fake_model.responses
    return {
        "inputTokens": sum(response["usage"]["inputTokens"] for response in responses),
        "outputTokens": sum(response["usage"]["outputTokens"] for response in responses),
        "cost": sum(response["usage"]["cost"] for response in responses),
    }


def options(**extra):
    return {"model": create_model(), "max_subtasks": 5, "concurrency": 2, "max_plan_attempts": 2, **extra}


class CountingModel:
    """Delegates to a model and records the peak number of worker calls in flight."""

    def __init__(self, model, worker_system):
        self.model = model
        self.worker_system = worker_system
        self.active = 0
        self.peak = 0

    async def generate(self, request):
        is_worker = system_of(request) == self.worker_system
        if is_worker:
            self.active += 1
            self.peak = max(self.peak, self.active)
        try:
            return await self.model.generate(request)
        finally:
            if is_worker:
                self.active -= 1


@test("parse_plan reads plain, fenced and prose-wrapped plans, keeps at most max_subtasks and rejects invalid shapes")
def _():
    text = json.dumps(PLAN, separators=(",", ":"))
    assert mod.parse_plan(text, 5) == PLAN["subtasks"]
    assert mod.parse_plan(f"Here is the plan:\n```json\n{text}\n```", 5) == PLAN["subtasks"]
    assert mod.parse_plan(text, 2) == PLAN["subtasks"][:2]
    for invalid in [
        "",
        "no plan today",
        text[:40],
        text[:-1] + ",}",
        text.replace('"', "'"),
        '{"subtasks": []}',
        '{"tasks": [{"id": "a", "instruction": "x"}]}',
        '{"subtasks": [{"id": "a"}]}',
        '{"subtasks": [{"id": "a", "instruction": "  "}]}',
        '{"subtasks": [{"id": 1, "instruction": "x"}]}',
        '{"subtasks": [{"id": "a", "instruction": "x"}, {"id": "a", "instruction": "y"}]}',
    ]:
        assert mod.parse_plan(invalid, 5) is None, invalid


@test("run_with_concurrency keeps input order and never runs more than the limit at once")
async def _():
    tracker = {"active": 0, "peak": 0}

    async def run(delay, index):
        tracker["active"] += 1
        tracker["peak"] = max(tracker["peak"], tracker["active"])
        await asyncio.sleep(delay / 1000)
        tracker["active"] -= 1
        return f"item-{index}"

    delays = [12, 2, 8, 1, 6, 3, 1]
    results = await mod.run_with_concurrency(delays, 3, run)
    assert results == [f"item-{index}" for index in range(len(delays))]
    assert tracker["peak"] == 3

    tracker["peak"] = 0

    async def double(delay, index):
        tracker["active"] += 1
        tracker["peak"] = max(tracker["peak"], tracker["active"])
        await asyncio.sleep(delay / 1000)
        tracker["active"] -= 1
        return delay * 2

    assert await mod.run_with_concurrency([1, 2], 10, double) == [2, 4]
    assert tracker["peak"] == 2

    async def one(item, index):
        return 1

    assert await mod.run_with_concurrency([], 3, one) == []


@test("plans with a JSON request, runs one worker per subtask and synthesizes every finding")
async def _():
    script_roles()
    result = await mod.orchestrate(QUESTION, **options())
    assert result["plan"] == PLAN["subtasks"]
    assert result["answer"] == "Synthesized comparison of the findings."
    assert result["results"] == [
        {"id": subtask["id"], "status": "ok", "output": f"Findings for: {subtask['instruction']}", "error": None}
        for subtask in PLAN["subtasks"]
    ]
    planner = requests_with(mod.PLANNER_SYSTEM)[0]
    assert planner["responseFormat"] == {"type": "json"}
    assert QUESTION in user_of(planner)
    assert "5" in user_of(planner)
    workers = requests_with(mod.WORKER_SYSTEM)
    assert [request["messages"] for request in workers] == [
        [
            {"role": "system", "content": mod.WORKER_SYSTEM},
            {"role": "user", "content": subtask["instruction"]},
        ]
        for subtask in PLAN["subtasks"]
    ]
    synthesis = requests_with(mod.SYNTHESIZER_SYSTEM)
    assert len(synthesis) == 1
    synthesis_input = user_of(synthesis[0])
    assert QUESTION in synthesis_input
    for subtask in PLAN["subtasks"]:
        assert f"Findings for: {subtask['instruction']}" in synthesis_input
    assert len(fake_model.requests) == 5


@test("runs workers in parallel without exceeding the concurrency limit")
async def _():
    subtasks = [{"id": f"vendor-{index}", "instruction": f"Research vendor {index}."} for index in range(1, 7)]
    script_roles(
        plan=lambda call: respond.json({"subtasks": subtasks}),
        worker=lambda instruction: respond.slow(8, respond.text(f"Findings for: {instruction}")),
    )
    counting_model = CountingModel(create_model(), mod.WORKER_SYSTEM)
    result = await mod.orchestrate(QUESTION, **options(model=counting_model, max_subtasks=6, concurrency=3))
    assert counting_model.peak == 3
    assert [worker["id"] for worker in result["results"]] == [subtask["id"] for subtask in subtasks]
    assert all(worker["status"] == "ok" for worker in result["results"])


@test("a failed worker does not sink the run, and a run where every worker fails returns no answer without synthesis")
async def _():
    def worker(instruction):
        if "Quill" in instruction:
            return respond.error(503)
        if "Rook" in instruction:
            return respond.refusal()
        return respond.text(f"Findings for: {instruction}")

    script_roles(worker=worker)
    result = await mod.orchestrate(QUESTION, **options())
    assert [[worker["id"], worker["status"], worker["error"]] for worker in result["results"]] == [
        ["nimbus", "ok", None],
        ["quill", "failed", "overloaded"],
        ["rook", "failed", "refusal"],
    ]
    assert result["results"][1]["output"] is None
    assert result["answer"] == "Synthesized comparison of the findings."
    synthesis_input = user_of(requests_with(mod.SYNTHESIZER_SYSTEM)[0])
    assert "Findings for: Research Nimbus" in synthesis_input
    assert "quill" in synthesis_input
    assert "rook" in synthesis_input

    fake_model.reset()
    script_roles(worker=lambda instruction: respond.one_of([respond.error(500), respond.truncated("Partial findings about the vendor", 0.3)]))
    failed = await mod.orchestrate(QUESTION, **options())
    assert failed["answer"] is None
    assert all(worker["status"] == "failed" for worker in failed["results"])
    assert len(requests_with(mod.SYNTHESIZER_SYSTEM)) == 0


@test("survives malformed plans by re-planning, and falls back to one subtask when every attempt fails")
async def _():
    async def scenario():
        script_roles(plan=lambda call: respond.malformed_json(PLAN) if call == 1 else respond.json(PLAN))
        result = await mod.orchestrate(QUESTION, **options())
        assert result["plan"] == PLAN["subtasks"]
        assert len(requests_with(mod.PLANNER_SYSTEM)) <= 2
        assert len(requests_with(mod.WORKER_SYSTEM)) == 3

    await for_each_seed(20, scenario)

    fake_model.reset()
    script_roles(plan=lambda call: respond.error(500) if call == 1 else respond.text("I would split this by vendor."))
    fallback = await mod.orchestrate(QUESTION, **options(max_plan_attempts=2))
    assert len(requests_with(mod.PLANNER_SYSTEM)) == 2
    assert fallback["plan"] == [{"id": "task-1", "instruction": QUESTION}]
    assert user_of(requests_with(mod.WORKER_SYSTEM)[0]) == QUESTION
    assert fallback["answer"] == "Synthesized comparison of the findings."


@test("accounts usage and cost from every response of every role, across seeds")
async def _():
    async def scenario():
        fake_model.configure(pricing={"inputPerMillion": 3, "outputPerMillion": 15})
        script_roles(
            plan=lambda call: respond.one_of([respond.json(PLAN), respond.malformed_json(PLAN), respond.error(429, retry_after_ms=1)]),
            worker=lambda instruction: respond.one_of([respond.text([f"Findings for: {instruction}", f"Notes on {instruction}"]), respond.error(500), respond.refusal()]),
        )
        result = await mod.orchestrate(QUESTION, **options(max_plan_attempts=3))
        totals = sum_usage()
        usage = result["usage"]
        assert usage["calls"] == len(fake_model.responses)
        assert usage["inputTokens"] == totals["inputTokens"]
        assert usage["outputTokens"] == totals["outputTokens"]
        assert usage["cost"] == approx(totals["cost"], abs=1e-12)
        assert len(result["results"]) == len(result["plan"])
        assert len(requests_with(mod.SYNTHESIZER_SYSTEM)) == (0 if result["answer"] is None else 1)

    await for_each_seed(15, scenario)
