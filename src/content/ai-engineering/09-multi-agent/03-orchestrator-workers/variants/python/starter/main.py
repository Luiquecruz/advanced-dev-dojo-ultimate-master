import asyncio
import json

from dojo_ai import ModelError

PLANNER_SYSTEM = 'You are the lead researcher. Split the question into independent subtasks a worker can research alone. Reply with JSON only: {"subtasks": [{"id": "...", "instruction": "..."}]}.'
WORKER_SYSTEM = "You are a research worker. Complete only the subtask you are given and reply with concise findings."
SYNTHESIZER_SYSTEM = "You are the lead researcher. Combine the worker findings into one answer to the question. Say which subtasks failed."


# TODO: extract the JSON object (fences, prose), validate every subtask, keep at most max_subtasks, return None when unusable
def parse_plan(text, max_subtasks):
    return json.loads(text)["subtasks"]


# TODO: run at most `limit` items at once and keep the results in input order
async def run_with_concurrency(items, limit, run):
    return list(await asyncio.gather(*(run(item, index) for index, item in enumerate(items))))


# TODO: re-plan on unusable plans (fallback to one subtask), contain worker failures, skip synthesis when every worker failed, sum the usage of every response
async def orchestrate(question, *, model, max_subtasks, concurrency, max_plan_attempts):
    plan_response = await model.generate({
        "messages": [
            {"role": "system", "content": PLANNER_SYSTEM},
            {"role": "user", "content": f"Question: {question}\nUse at most {max_subtasks} subtasks."},
        ],
        "responseFormat": {"type": "json"},
    })
    plan = parse_plan(plan_response["text"], max_subtasks) or []

    async def work(subtask, index):
        response = await model.generate({
            "messages": [
                {"role": "system", "content": WORKER_SYSTEM},
                {"role": "user", "content": subtask["instruction"]},
            ],
        })
        return {"id": subtask["id"], "status": "ok", "output": response["text"], "error": None}

    results = await run_with_concurrency(plan, concurrency, work)
    findings = "\n\n".join(result["output"] for result in results)
    synthesis = await model.generate({
        "messages": [
            {"role": "system", "content": SYNTHESIZER_SYSTEM},
            {"role": "user", "content": f"Question: {question}\n\nFindings:\n{findings}"},
        ],
    })
    usage = synthesis["usage"]
    return {
        "answer": synthesis["text"],
        "plan": plan,
        "results": results,
        "usage": {"calls": 1, "inputTokens": usage["inputTokens"], "outputTokens": usage["outputTokens"], "cost": usage["cost"]},
    }
