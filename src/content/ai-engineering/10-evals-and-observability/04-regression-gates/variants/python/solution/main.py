EPSILON = 1e-9


async def run_once(variant, eval_case, score):
    try:
        response = await variant["model"].generate(variant["prompt"](eval_case))
    except Exception:
        return "error"
    return "pass" if score(response["text"], eval_case) else "fail"


async def evaluate_variant(variant, *, dataset, score, repeats=3):
    cases = []
    for eval_case in dataset:
        passes = 0
        errors = 0
        for _ in range(repeats):
            outcome = await run_once(variant, eval_case, score)
            passes += 1 if outcome == "pass" else 0
            errors += 1 if outcome == "error" else 0
        cases.append({"id": eval_case["id"], "critical": eval_case.get("critical") is True, "runs": repeats, "passes": passes, "errors": errors, "passRate": passes / repeats})
    total_runs = sum(result["runs"] for result in cases)
    total_passes = sum(result["passes"] for result in cases)
    return {
        "variant": variant["name"],
        "repeats": repeats,
        "cases": cases,
        "passRate": 0 if total_runs == 0 else total_passes / total_runs,
        "flaky": [result["id"] for result in cases if 0 < result["passRate"] < 1],
    }


def compare_runs(baseline, candidate, *, tolerance=0.02, case_tolerance=0.34):
    reasons = []
    candidate_by_id = {result["id"]: result for result in candidate["cases"]}
    baseline_ids = {result["id"] for result in baseline["cases"]}
    missing = [result["id"] for result in baseline["cases"] if result["id"] not in candidate_by_id]
    added = [result["id"] for result in candidate["cases"] if result["id"] not in baseline_ids]
    if missing or added:
        reasons.append(f"The runs used different datasets (missing: {', '.join(missing) or 'none'}; added: {', '.join(added) or 'none'})")

    diffs = [
        {
            "id": before["id"],
            "critical": before["critical"] or candidate_by_id[before["id"]]["critical"],
            "baseline": before["passRate"],
            "candidate": candidate_by_id[before["id"]]["passRate"],
            "delta": candidate_by_id[before["id"]]["passRate"] - before["passRate"],
        }
        for before in baseline["cases"]
        if before["id"] in candidate_by_id
    ]
    regressions = [diff for diff in diffs if diff["delta"] < -case_tolerance - EPSILON]
    improvements = [diff for diff in diffs if diff["delta"] > case_tolerance + EPSILON]

    delta = candidate["passRate"] - baseline["passRate"]
    if delta < -tolerance - EPSILON:
        reasons.append(f"Pass rate dropped from {baseline['passRate']:.3f} to {candidate['passRate']:.3f}, beyond the tolerance of {tolerance}")
    for diff in regressions:
        if diff["critical"]:
            reasons.append(f'Critical case "{diff["id"]}" regressed from {diff["baseline"]:.2f} to {diff["candidate"]:.2f}')

    return {
        "decision": "block" if reasons else "pass",
        "baselinePassRate": baseline["passRate"],
        "candidatePassRate": candidate["passRate"],
        "delta": delta,
        "regressions": regressions,
        "improvements": improvements,
        "reasons": reasons,
    }
