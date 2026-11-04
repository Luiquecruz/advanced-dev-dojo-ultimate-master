import inspect
import json
import re
from dataclasses import dataclass
from typing import Callable


@dataclass
class Verifier:
    """Checks an output: `check(output)` returns (plain or async) `{"passed": bool, "feedback": str}`, feedback optional."""

    name: str
    check: Callable


async def first_failure(verifiers, output):
    for verifier in verifiers:
        result = verifier.check(output)
        if inspect.isawaitable(result):
            result = await result
        if not result["passed"]:
            return {"verifier": verifier.name, "feedback": result.get("feedback") or ""}
    return None


async def run_verified(model, task, *, verifiers, max_attempts):
    messages = [] if task.get("system") is None else [{"role": "system", "content": task["system"]}]
    messages.append({"role": "user", "content": task["prompt"]})
    failures = []
    output = ""
    for attempt in range(1, max_attempts + 1):
        response = await model.generate({"messages": list(messages)})
        output = response["text"]
        if response["finishReason"] == "stop":
            failure = await first_failure(verifiers, output)
        else:
            failure = {"verifier": "completion", "feedback": f"The answer is incomplete (finish reason: {response['finishReason']}). Give a complete answer."}
        if failure is None:
            return {"status": "passed", "output": output, "attempts": attempt, "failures": failures}
        failures.append({"attempt": attempt, **failure})
        if attempt < max_attempts:
            messages.append({"role": "assistant", "content": output})
            messages.append({"role": "user", "content": f'Verifier "{failure["verifier"]}" failed:\n{failure["feedback"]}\nFix the problem and answer again with the complete result only.'})
    return {"status": "failed", "output": output, "attempts": max_attempts, "failures": failures}


def issue_line(issue):
    path = ".".join(str(part) for part in issue["path"]) if issue["path"] else "(root)"
    return f"{path}: {issue['message']}"


def schema_verifier(schema):
    def check(output):
        try:
            value = json.loads(output)
        except ValueError as error:
            return {"passed": False, "feedback": f"Not valid JSON: {error}"}
        result = schema.safe_parse(value)
        if result["success"]:
            return {"passed": True}
        return {"passed": False, "feedback": "\n".join(issue_line(issue) for issue in result["issues"])}

    return Verifier("schema", check)


def examples_verifier(*, should_match, should_reject):
    def check(output):
        try:
            pattern = re.compile(output.strip())
        except re.error as error:
            return {"passed": False, "feedback": f"Not a valid regular expression: {error}"}
        lines = [
            *[f'should match: "{example}"' for example in should_match if pattern.fullmatch(example) is None],
            *[f'should not match: "{example}"' for example in should_reject if pattern.fullmatch(example) is not None],
        ]
        return {"passed": True} if not lines else {"passed": False, "feedback": "\n".join(lines)}

    return Verifier("examples", check)
