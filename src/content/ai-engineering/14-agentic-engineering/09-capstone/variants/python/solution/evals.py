import inspect

from agent import cited_sources


def check_case(golden_case, result):
    if result["status"] != "answered" or result["answer"] is None:
        return [f"status {result['status']}"]
    cited = cited_sources(result["answer"])
    answer = result["answer"].lower()
    missing_sources = [f"missing source {source_id}" for source_id in golden_case["expectedSources"] if source_id not in cited]
    missing_mentions = [f'missing "{text}"' for text in golden_case["mustMention"] if text.lower() not in answer]
    return [*missing_sources, *missing_mentions]


async def run_evals(cases, answer, *, threshold):
    results = []
    for golden_case in cases:
        try:
            result = answer(golden_case["question"])
            if inspect.isawaitable(result):
                result = await result
        except Exception as error:
            results.append({"id": golden_case["id"], "pass": False, "status": "error", "reasons": [f"error: {error}"], "costUsd": 0})
            continue
        reasons = check_case(golden_case, result)
        results.append({"id": golden_case["id"], "pass": not reasons, "status": result["status"], "reasons": reasons, "costUsd": result["costUsd"]})
    passed = sum(1 for result in results if result["pass"])
    pass_rate = 0 if not cases else passed / len(cases)
    critical_failures = [golden_case["id"] for golden_case, result in zip(cases, results) if golden_case["critical"] and not result["pass"]]
    return {
        "cases": results,
        "passed": passed,
        "total": len(cases),
        "passRate": pass_rate,
        "totalCostUsd": sum(result["costUsd"] for result in results),
        "criticalFailures": critical_failures,
        "gatePassed": pass_rate >= threshold and not critical_failures,
    }
