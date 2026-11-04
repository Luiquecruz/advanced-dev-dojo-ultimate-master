from dojo_ai import create_model

DATASET = [
    {"id": "vat", "input": "My invoice shows the wrong VAT number.", "expected": "billing"},
    {"id": "parcel", "input": "The parcel tracking has not moved for a week.", "expected": "shipping"},
    {"id": "double-charge", "input": "I was charged twice for one order.", "expected": "billing", "critical": True},
    {"id": "password", "input": "I cannot reset my password.", "expected": "account"},
]


def exact_label(output, eval_case):
    return output.strip().lower() == eval_case["expected"]


def variant(name, system):
    return {
        "name": name,
        "model": create_model(name),
        "prompt": lambda eval_case: {"messages": [{"role": "system", "content": system}, {"role": "user", "content": eval_case["input"]}]},
    }


def variant_run(name, cases):
    results = [
        {"id": case_id, "critical": len(rest) > 0 and rest[0] is True, "runs": runs, "passes": passes, "errors": 0, "passRate": passes / runs}
        for case_id, passes, runs, *rest in cases
    ]
    runs = sum(result["runs"] for result in results)
    passes = sum(result["passes"] for result in results)
    return {
        "variant": name,
        "repeats": results[0]["runs"],
        "cases": results,
        "passRate": passes / runs,
        "flaky": [result["id"] for result in results if 0 < result["passRate"] < 1],
    }


def last_user(request):
    return [message for message in request["messages"] if message["role"] == "user"][-1]["content"]


def label_for(input_text):
    return next(eval_case for eval_case in DATASET if eval_case["input"] == input_text)["expected"]


@test("evaluate_variant runs every case `repeats` times in a row with the variant prompt and model, and reports per-case and aggregate pass rates")
async def _():
    fake_model.handle(lambda request, context: respond.text(label_for(last_user(request))))
    fake_model.reply(*[respond.text(label) for label in ["billing", "Billing", "billing", "account", "shipping", "account", "shipping", "shipping", "shipping"]])
    run = await mod.evaluate_variant(variant("prompt-v1", "Classify the ticket."), dataset=DATASET, score=exact_label, repeats=3)
    assert len(fake_model.requests) == 12
    assert [last_user(request) for request in fake_model.requests] == [eval_case["input"] for eval_case in DATASET for _ in range(3)]
    for request in fake_model.requests:
        assert request["model"] == "prompt-v1"
        assert request["messages"][0]["content"] == "Classify the ticket."
    assert run["variant"] == "prompt-v1"
    assert run["repeats"] == 3
    assert [[result["id"], result["passes"], result["runs"], result["critical"]] for result in run["cases"]] == [
        ["vat", 3, 3, False],
        ["parcel", 1, 3, False],
        ["double-charge", 0, 3, True],
        ["password", 3, 3, False],
    ]
    assert run["cases"][1]["passRate"] == approx(1 / 3, abs=1e-6)
    assert run["passRate"] == approx(7 / 12, abs=1e-6)
    assert run["flaky"] == ["parcel"]


@test("evaluate_variant counts model errors as failed runs and keeps going")
async def _():
    fake_model.handle(lambda request, context: respond.text(label_for(last_user(request))))
    fake_model.reply(respond.error(429), respond.text("billing"), respond.error(503), respond.context_length())
    run = await mod.evaluate_variant(variant("prompt-v1", "Classify the ticket."), dataset=DATASET, score=exact_label, repeats=2)
    assert len(fake_model.requests) == 8
    assert [[result["passes"], result["errors"]] for result in run["cases"]] == [
        [1, 1],
        [0, 2],
        [2, 0],
        [2, 0],
    ]
    assert run["passRate"] == approx(5 / 8, abs=1e-6)
    assert run["flaky"] == ["vat"]
    default_repeats = await mod.evaluate_variant(variant("prompt-v1", "x"), dataset=DATASET[:1], score=exact_label)
    assert default_repeats["repeats"] == 3


@test("compare_runs diffs every case and lists only changes larger than the case tolerance")
def _():
    baseline = variant_run("v1", [("vat", 3, 3), ("parcel", 2, 3), ("double-charge", 3, 3, True), ("password", 1, 3), ("address", 3, 3)])
    candidate = variant_run("v2", [("vat", 1, 3), ("parcel", 3, 3), ("double-charge", 3, 3, True), ("password", 3, 3), ("address", 2, 3)])
    result = mod.compare_runs(baseline, candidate, tolerance=0.05, case_tolerance=0.34)
    assert result["baselinePassRate"] == approx(12 / 15, abs=1e-6)
    assert result["candidatePassRate"] == approx(12 / 15, abs=1e-6)
    assert result["delta"] == approx(0, abs=1e-6)
    assert len(result["regressions"]) == 1
    regression = result["regressions"][0]
    assert [regression["id"], regression["critical"], regression["baseline"]] == ["vat", False, 1]
    assert regression["candidate"] == approx(1 / 3, abs=1e-6)
    assert regression["delta"] == approx(-2 / 3, abs=1e-6)
    assert [diff["id"] for diff in result["improvements"]] == ["password"]
    assert result["decision"] == "pass"
    assert result["reasons"] == []


@test("compare_runs blocks an aggregate drop beyond the tolerance, and lets noise within it pass")
def _():
    baseline = variant_run("v1", [("a", 10, 10), ("b", 9, 10), ("c", 8, 10), ("d", 9, 10)])
    within_noise = variant_run("v2", [("a", 10, 10), ("b", 8, 10), ("c", 8, 10), ("d", 8, 10)])
    at_tolerance = mod.compare_runs(baseline, within_noise, tolerance=0.05)
    assert at_tolerance["delta"] == approx(-0.05, abs=1e-6)
    assert at_tolerance["decision"] == "pass"

    worse = variant_run("v3", [("a", 9, 10), ("b", 8, 10), ("c", 7, 10), ("d", 8, 10)])
    blocked = mod.compare_runs(baseline, worse, tolerance=0.05)
    assert blocked["decision"] == "block"
    assert len(blocked["reasons"]) > 0
    assert blocked["regressions"] == []
    assert mod.compare_runs(baseline, worse, tolerance=0.1)["decision"] == "pass"
    assert mod.compare_runs(baseline, worse)["decision"] == "block"


@test("compare_runs blocks a regressed critical case even when the aggregate improves")
def _():
    baseline = variant_run("v1", [("vat", 1, 3), ("parcel", 1, 3), ("double-charge", 3, 3, True), ("password", 1, 3)])
    candidate = variant_run("v2", [("vat", 3, 3), ("parcel", 3, 3), ("double-charge", 1, 3, True), ("password", 3, 3)])
    result = mod.compare_runs(baseline, candidate, tolerance=0.02, case_tolerance=0.34)
    assert result["delta"] > 0
    assert result["decision"] == "block"
    assert [[diff["id"], diff["critical"]] for diff in result["regressions"]] == [["double-charge", True]]
    assert any("double-charge" in reason for reason in result["reasons"])
    assert len(result["improvements"]) == 3


@test("compare_runs refuses to compare runs on different datasets")
def _():
    baseline = variant_run("v1", [("vat", 3, 3), ("parcel", 3, 3)])
    candidate = variant_run("v2", [("vat", 3, 3), ("password", 3, 3)])
    result = mod.compare_runs(baseline, candidate)
    assert result["decision"] == "block"
    assert "parcel" in " ".join(result["reasons"])
    assert "password" in " ".join(result["reasons"])


@test("end to end: repeated runs catch a candidate prompt that only sometimes breaks the critical case")
async def _():
    blocked = 0

    def behavior(request, context):
        label = label_for(last_user(request))
        if request["model"] == "prompt-v2" and label == "billing" and "twice" in last_user(request):
            return respond.sometimes(0.5, respond.text("billing"), respond.text("shipping"))
        return respond.text([label, label.upper()])

    async def scenario():
        nonlocal blocked
        fake_model.handle(behavior)
        baseline = await mod.evaluate_variant(variant("prompt-v1", "Classify the ticket."), dataset=DATASET, score=exact_label, repeats=4)
        candidate = await mod.evaluate_variant(variant("prompt-v2", "Classify the ticket. Be brief."), dataset=DATASET, score=exact_label, repeats=4)
        assert baseline["passRate"] == 1
        critical = next(result for result in candidate["cases"] if result["id"] == "double-charge")
        gate = mod.compare_runs(baseline, candidate, tolerance=0.1, case_tolerance=0.25)
        assert gate["decision"] == ("block" if critical["passRate"] < 0.75 else "pass")
        assert gate["delta"] == approx(candidate["passRate"] - 1, abs=1e-6)
        blocked += 1 if gate["decision"] == "block" else 0

    await for_each_seed(10, scenario)
    assert blocked > 0
