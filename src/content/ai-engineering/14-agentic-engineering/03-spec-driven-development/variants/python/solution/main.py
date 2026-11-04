import json
import re

REQUIREMENT_LINE = re.compile(r"^\s*[-*]\s+(REQ-\d+):\s*(.*)$", re.ASCII)
TASK_LINE = re.compile(r"^\s*[-*]\s+\[([ xX])\]\s+(TASK-\d+):\s*(.*)$", re.ASCII)
REQUIREMENT_ID = re.compile(r"(?<![\w-])REQ-\d+(?![\w-])", re.ASCII)
TASK_ID = re.compile(r"(?<![\w-])TASK-\d+(?![\w-])", re.ASCII)
PLANNED_TASK_ID = re.compile(r"TASK-\d+", re.ASCII)

PLANNER_SYSTEM_PROMPT = "\n".join([
    "You break a specification into implementation tasks.",
    'Answer with JSON only: {"tasks":[{"id":"TASK-1","text":"...","requirements":["REQ-1"]}]}.',
    "Every task id is TASK- followed by a number. Every task lists the requirement ids it implements.",
])


class SpecError(Exception):
    """A spec, task list or plan that cannot be read."""


def unique_matches(text, pattern):
    return list(dict.fromkeys(pattern.findall(text)))


def find_references(text):
    return {"requirements": unique_matches(text, REQUIREMENT_ID), "tasks": unique_matches(text, TASK_ID)}


def parse_requirements(markdown):
    requirements = []
    for line in markdown.split("\n"):
        match = REQUIREMENT_LINE.match(line)
        if match is None:
            continue
        if any(requirement["id"] == match[1] for requirement in requirements):
            raise SpecError(f"Duplicate requirement id {match[1]}")
        requirements.append({"id": match[1], "text": match[2].strip()})
    return requirements


def parse_tasks(markdown):
    tasks = []
    for line in markdown.split("\n"):
        match = TASK_LINE.match(line)
        if match is None:
            continue
        if any(task["id"] == match[2] for task in tasks):
            raise SpecError(f"Duplicate task id {match[2]}")
        tasks.append({"id": match[2], "text": match[3].strip(), "done": match[1] != " ", "requirements": find_references(match[3])["requirements"]})
    return tasks


def build_traceability(*, spec, tasks, tests):
    requirements = parse_requirements(spec)
    task_list = parse_tasks(tasks) if isinstance(tasks, str) else tasks
    requirement_ids = {requirement["id"] for requirement in requirements}
    task_by_id = {task["id"]: task for task in task_list}
    unknown_references = []

    for task in task_list:
        unknown_references.extend({"from": task["id"], "id": requirement_id} for requirement_id in task["requirements"] if requirement_id not in requirement_ids)

    verified_by_test = {}
    for test in tests:
        references = find_references(test)
        verified = {requirement_id for requirement_id in references["requirements"] if requirement_id in requirement_ids}
        unknown_references.extend({"from": test, "id": requirement_id} for requirement_id in references["requirements"] if requirement_id not in requirement_ids)
        for task_id in references["tasks"]:
            task = task_by_id.get(task_id)
            if task is None:
                unknown_references.append({"from": test, "id": task_id})
                continue
            verified.update(requirement_id for requirement_id in task["requirements"] if requirement_id in requirement_ids)
        verified_by_test[test] = verified

    rows = []
    for requirement in requirements:
        implementing = [task["id"] for task in task_list if requirement["id"] in task["requirements"]]
        verifying = [test for test in tests if requirement["id"] in verified_by_test[test]]
        status = "covered" if verifying else "untested" if implementing else "unplanned"
        rows.append({"requirement": requirement["id"], "tasks": implementing, "tests": verifying, "status": status})

    covered = sum(1 for row in rows if row["status"] == "covered")
    return {
        "rows": rows,
        "uncoveredRequirements": [row["requirement"] for row in rows if row["status"] != "covered"],
        "orphanTasks": [task["id"] for task in task_list if not any(requirement_id in requirement_ids for requirement_id in task["requirements"])],
        "testsWithoutRequirement": [test for test in tests if not verified_by_test[test]],
        "unknownReferences": unknown_references,
        "coverage": 0 if not requirements else covered / len(requirements),
    }


def read_plan(text):
    try:
        value = json.loads(text)
    except ValueError:
        return "the reply is not valid JSON"
    tasks = value.get("tasks") if isinstance(value, dict) else None
    if not isinstance(tasks, list) or not tasks:
        return 'expected an object with a non-empty "tasks" array'
    plan = []
    for index, task in enumerate(tasks):
        candidate = task if isinstance(task, dict) else {}
        task_id = candidate.get("id")
        if not isinstance(task_id, str) or PLANNED_TASK_ID.fullmatch(task_id) is None:
            return f"tasks[{index}].id must look like TASK-1"
        text = candidate.get("text")
        if not isinstance(text, str) or text.strip() == "":
            return f"tasks[{index}].text must be a non-empty string"
        requirements = candidate.get("requirements")
        if not isinstance(requirements, list) or any(not isinstance(requirement_id, str) for requirement_id in requirements):
            return f"tasks[{index}].requirements must be an array of requirement ids"
        plan.append({"id": task_id, "text": text.strip(), "done": False, "requirements": list(dict.fromkeys(requirements))})
    return plan


async def plan_tasks(model, spec, *, max_attempts=2):
    messages = [
        {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
        {"role": "user", "content": spec},
    ]
    problem = ""
    for _attempt in range(max_attempts):
        response = await model.generate({"messages": list(messages), "responseFormat": {"type": "json"}})
        plan = read_plan(response["text"])
        if not isinstance(plan, str):
            return plan
        problem = plan
        messages.append({"role": "assistant", "content": response["text"]})
        messages.append({"role": "user", "content": f"Invalid plan: {problem}. Answer again with JSON only."})
    raise SpecError(f"No valid plan after {max_attempts} attempts: {problem}")
