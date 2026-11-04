import json
import re

PLANNER_SYSTEM_PROMPT = "\n".join([
    "You break a specification into implementation tasks.",
    'Answer with JSON only: {"tasks":[{"id":"TASK-1","text":"...","requirements":["REQ-1"]}]}.',
    "Every task id is TASK- followed by a number. Every task lists the requirement ids it implements.",
])


class SpecError(Exception):
    """A spec, task list or plan that cannot be read."""


def find_references(text):
    # TODO: every whole REQ-<digits> and TASK-<digits> id, unique, in order of first appearance
    return {"requirements": re.findall(r"REQ-\d+", text), "tasks": re.findall(r"TASK-\d+", text)}


def parse_requirements(markdown):
    # TODO: read "- REQ-<n>: text" list items (also "*" and indented), ignore everything else, raise SpecError on a duplicate id
    raise NotImplementedError("parse_requirements")


def parse_tasks(markdown):
    # TODO: read "- [ ] TASK-<n>: text" and "- [x] ..." lines with their unique requirement references, raise SpecError on a duplicate id
    raise NotImplementedError("parse_tasks")


def build_traceability(*, spec, tasks, tests):
    # TODO: rows per requirement, uncovered requirements, orphan tasks, tests without a requirement, unknown references and coverage
    raise NotImplementedError("build_traceability")


async def plan_tasks(model, spec, *, max_attempts=2):
    # TODO: ask for a JSON plan, validate its shape, retry with "Invalid plan" feedback, raise SpecError after max_attempts
    response = await model.generate({"messages": [{"role": "system", "content": PLANNER_SYSTEM_PROMPT}, {"role": "user", "content": spec}], "responseFormat": {"type": "json"}})
    return json.loads(response["text"])["tasks"]
