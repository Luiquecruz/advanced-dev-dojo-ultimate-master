from dataclasses import dataclass
from typing import Callable


@dataclass
class Verifier:
    """Checks an output: `check(output)` returns (plain or async) `{"passed": bool, "feedback": str}`, feedback optional."""

    name: str
    check: Callable


async def run_verified(model, task, *, verifiers, max_attempts):
    # TODO: up to max_attempts model calls; check completion, run verifiers in order until one fails, feed the failure back, return passed or failed with every failure
    response = await model.generate({"messages": [{"role": "user", "content": task["prompt"]}]})
    return {"status": "passed", "output": response["text"], "attempts": 1, "failures": []}


def schema_verifier(schema):
    # TODO: "Not valid JSON..." when parsing fails, otherwise one "path: message" line per issue from schema.safe_parse
    return Verifier("schema", lambda output: {"passed": True})


def examples_verifier(*, should_match, should_reject):
    # TODO: "Not a valid regular expression..." when it does not compile, otherwise one line per failing example; match whole strings
    return Verifier("examples", lambda output: {"passed": True})
