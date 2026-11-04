from agent import cited_sources


async def run_evals(cases, answer, *, threshold):
    # TODO: run each case in order; a case passes when answered, citing every expected source and mentioning every required text; errors are failed cases; gate on threshold and critical cases
    results = []
    for golden_case in cases:
        result = await answer(golden_case["question"])
        results.append({"id": golden_case["id"], "pass": result["status"] == "answered", "status": result["status"], "reasons": [], "costUsd": result["costUsd"]})
    passed = sum(1 for result in results if result["pass"])
    return {"cases": results, "passed": passed, "total": len(cases), "passRate": passed / len(cases), "totalCostUsd": 0, "criticalFailures": [], "gatePassed": passed / len(cases) >= threshold}
