async def evaluate_variant(variant, *, dataset, score, repeats=3):
    # TODO: run every case `repeats` times in a row; a model error is a failed run, counted in "errors"; list flaky cases
    cases = []
    for eval_case in dataset:
        response = await variant["model"].generate(variant["prompt"](eval_case))
        passes = 1 if score(response["text"], eval_case) else 0
        cases.append({"id": eval_case["id"], "critical": eval_case.get("critical") is True, "runs": 1, "passes": passes, "errors": 0, "passRate": passes})
    pass_rate = sum(result["passRate"] for result in cases) / len(cases)
    return {"variant": variant["name"], "repeats": 1, "cases": cases, "passRate": pass_rate, "flaky": []}


def compare_runs(baseline, candidate, *, tolerance=0.02, case_tolerance=0.34):
    # TODO: refuse different datasets, diff every case, block on an aggregate drop beyond tolerance or a regressed critical case
    delta = candidate["passRate"] - baseline["passRate"]
    return {
        "decision": "block" if delta < 0 else "pass",
        "baselinePassRate": baseline["passRate"],
        "candidatePassRate": candidate["passRate"],
        "delta": delta,
        "regressions": [],
        "improvements": [],
        "reasons": [],
    }
