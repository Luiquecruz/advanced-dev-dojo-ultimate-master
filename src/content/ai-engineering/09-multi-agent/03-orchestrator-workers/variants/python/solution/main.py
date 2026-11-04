import asyncio
import json

from dojo_ai import ModelError

PLANNER_SYSTEM = 'You are the lead researcher. Split the question into independent subtasks a worker can research alone. Reply with JSON only: {"subtasks": [{"id": "...", "instruction": "..."}]}.'
WORKER_SYSTEM = "You are a research worker. Complete only the subtask you are given and reply with concise findings."
SYNTHESIZER_SYSTEM = "You are the lead researcher. Combine the worker findings into one answer to the question. Say which subtasks failed."


def is_non_empty_string(value):
    return isinstance(value, str) and value.strip() != ""


def parse_plan(text, max_subtasks):
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        parsed = json.loads(text[start:end + 1])
    except ValueError:
        return None
    subtasks = parsed.get("subtasks") if isinstance(parsed, dict) else None
    if not isinstance(subtasks, list) or len(subtasks) == 0:
        return None
    plan = []
    ids = set()
    for subtask in subtasks:
        if not isinstance(subtask, dict):
            return None
        subtask_id = subtask.get("id")
        instruction = subtask.get("instruction")
        if not is_non_empty_string(subtask_id) or not is_non_empty_string(instruction) or subtask_id in ids:
            return None
        ids.add(subtask_id)
        plan.append({"id": subtask_id, "instruction": instruction})
    return plan[:max_subtasks]


async def run_with_concurrency(items, limit, run):
    semaphore = asyncio.Semaphore(limit)

    async def run_limited(item, index):
        async with semaphore:
            return await run(item, index)

    return list(await asyncio.gather(*(run_limited(item, index) for index, item in enumerate(items))))


def empty_usage():
    return {"calls": 0, "inputTokens": 0, "outputTokens": 0, "cost": 0}


def add_usage(totals, response):
    totals["calls"] += 1
    totals["inputTokens"] += response["usage"]["inputTokens"]
    totals["outputTokens"] += response["usage"]["outputTokens"]
    totals["cost"] += response["usage"]["cost"]


async def plan(question, model, max_subtasks, max_plan_attempts, usage):
    for _ in range(max_plan_attempts):
        try:
            response = await model.generate({
                "messages": [
                    {"role": "system", "content": PLANNER_SYSTEM},
                    {"role": "user", "content": f"Question: {question}\nUse at most {max_subtasks} subtasks."},
                ],
                "responseFormat": {"type": "json"},
            })
        except ModelError:
            continue
        add_usage(usage, response)
        subtasks = parse_plan(response["text"], max_subtasks)
        if subtasks is not None:
            return subtasks
    return [{"id": "task-1", "instruction": question}]


async def work(model, subtask, usage):
    try:
        response = await model.generate({
            "messages": [
                {"role": "system", "content": WORKER_SYSTEM},
                {"role": "user", "content": subtask["instruction"]},
            ],
        })
    except ModelError as error:
        return {"id": subtask["id"], "status": "failed", "output": None, "error": error.code}
    add_usage(usage, response)
    if response["finishReason"] != "stop" or response["text"].strip() == "":
        return {"id": subtask["id"], "status": "failed", "output": None, "error": response["finishReason"]}
    return {"id": subtask["id"], "status": "ok", "output": response["text"], "error": None}


def synthesis_prompt(question, results):
    findings = [f"[{result['id']}]\n{result['output']}" for result in results if result["status"] == "ok"]
    failed = [result["id"] for result in results if result["status"] == "failed"]
    failed_line = "Failed subtasks: none" if len(failed) == 0 else f"Failed subtasks: {', '.join(failed)}"
    return f"Question: {question}\n\nFindings:\n" + "\n\n".join(findings) + f"\n\n{failed_line}"


async def orchestrate(question, *, model, max_subtasks, concurrency, max_plan_attempts):
    usage = empty_usage()
    subtasks = await plan(question, model, max_subtasks, max_plan_attempts, usage)
    results = await run_with_concurrency(subtasks, concurrency, lambda subtask, index: work(model, subtask, usage))
    if all(result["status"] == "failed" for result in results):
        return {"answer": None, "plan": subtasks, "results": results, "usage": usage}
    synthesis = await model.generate({
        "messages": [
            {"role": "system", "content": SYNTHESIZER_SYSTEM},
            {"role": "user", "content": synthesis_prompt(question, results)},
        ],
    })
    add_usage(usage, synthesis)
    return {"answer": synthesis["text"], "plan": subtasks, "results": results, "usage": usage}
