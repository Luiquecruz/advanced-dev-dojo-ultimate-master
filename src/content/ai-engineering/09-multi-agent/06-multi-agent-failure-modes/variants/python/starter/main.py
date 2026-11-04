import asyncio
import json

from dojo_ai import ModelError

WORKER_SYSTEM = 'You are a research worker. Reply with JSON only: {"claims": [{"text": "...", "sourceId": "..."}]}, citing only the sources you were given.'


def voter_system(voter):
    return f'You are {voter}, an independent reviewer. Reply with JSON only: {{"answer": "..."}}.'


# TODO: reject unfinished replies, invalid JSON, missing or empty claims, blank texts and sources outside allowed_source_ids, listing every problem
def validate_worker_output(response, allowed_source_ids):
    return {"ok": True, "claims": json.loads(response["text"])["claims"]}


# TODO: validate every worker output, retry with the problems as feedback up to max_attempts, quarantine what still fails
async def gather_claims(tasks, *, model, max_attempts):
    result = {"accepted": [], "quarantined": []}
    for task in tasks:
        response = await model.generate({
            "messages": [
                {"role": "system", "content": WORKER_SYSTEM},
                {"role": "user", "content": f"{task['instruction']}\nAllowed sources: {', '.join(task['sourceIds'])}"},
            ],
            "responseFormat": {"type": "json"},
        })
        validation = validate_worker_output(response, task["sourceIds"])
        if validation["ok"]:
            result["accepted"].extend({**claim, "taskId": task["id"]} for claim in validation["claims"])
    return result


# TODO: first round in parallel and blind, quorum over all voters (abstentions included), a discussion round with anonymous answers only when needed
async def vote_independently(question, *, model, voters, quorum):
    answers = []
    for voter in voters:
        earlier = "" if len(answers) == 0 else f"\n\nOther reviewers answered: {', '.join(answers)}"
        response = await model.generate({
            "messages": [
                {"role": "system", "content": voter_system(voter)},
                {"role": "user", "content": f"{question}{earlier}"},
            ],
            "responseFormat": {"type": "json"},
        })
        answers.append(json.loads(response["text"])["answer"])
    top = answers.count(answers[0])
    if top / len(voters) >= quorum:
        return {"status": "consensus", "decision": answers[0], "rounds": 1, "ballots": [answers]}
    return {"status": "no_consensus", "decision": None, "rounds": 1, "ballots": [answers]}


class DelegationGuard:
    """Allows a delegation only when it makes no cycle and stays within the depth, fan-out and total limits."""

    def __init__(self, max_depth, max_fan_out, max_total):
        self.max_depth = max_depth
        self.max_fan_out = max_fan_out
        self.max_total = max_total
        self.total = 0

    # TODO: check cycle, depth, fan-out per delegating chain and total, in that order; count only allowed delegations
    def request(self, chain, target):
        if len(chain) > self.max_depth:
            return {"allowed": False, "reason": "depth"}
        self.total += 1
        return {"allowed": True}


def create_delegation_guard(*, max_depth, max_fan_out, max_total):
    return DelegationGuard(max_depth, max_fan_out, max_total)
