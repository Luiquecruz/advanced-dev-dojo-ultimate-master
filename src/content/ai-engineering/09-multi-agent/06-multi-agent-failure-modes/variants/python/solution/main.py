import asyncio
import json

from dojo_ai import ModelError

WORKER_SYSTEM = 'You are a research worker. Reply with JSON only: {"claims": [{"text": "...", "sourceId": "..."}]}, citing only the sources you were given.'


def voter_system(voter):
    return f'You are {voter}, an independent reviewer. Reply with JSON only: {{"answer": "..."}}.'


def field(value, key):
    return value.get(key) if isinstance(value, dict) else None


def validate_worker_output(response, allowed_source_ids):
    if response["finishReason"] != "stop":
        return {"ok": False, "problems": [f"finish reason {response['finishReason']}"]}
    try:
        parsed = json.loads(response["text"])
    except ValueError:
        return {"ok": False, "problems": ["output is not valid JSON"]}
    claims = field(parsed, "claims")
    if not isinstance(claims, list) or len(claims) == 0:
        return {"ok": False, "problems": ["no claims"]}
    problems = []
    for number, claim in enumerate(claims, start=1):
        text = field(claim, "text")
        source_id = field(claim, "sourceId")
        if not isinstance(text, str) or text.strip() == "":
            problems.append(f"claim {number} has no text")
        if not isinstance(source_id, str) or source_id not in allowed_source_ids:
            problems.append(f"claim {number} cites unknown source {source_id}")
    if problems:
        return {"ok": False, "problems": problems}
    return {"ok": True, "claims": [{"text": claim["text"], "sourceId": claim["sourceId"]} for claim in claims]}


async def run_task(task, model, max_attempts):
    problems = []
    for _ in range(max_attempts):
        feedback = "" if len(problems) == 0 else f"\n\nYour previous answer was rejected: {'; '.join(problems)}. Fix these problems."
        try:
            response = await model.generate({
                "messages": [
                    {"role": "system", "content": WORKER_SYSTEM},
                    {"role": "user", "content": f"{task['instruction']}\nAllowed sources: {', '.join(task['sourceIds'])}{feedback}"},
                ],
                "responseFormat": {"type": "json"},
            })
        except ModelError as error:
            problems = [f"model error {error.code}"]
            continue
        validation = validate_worker_output(response, task["sourceIds"])
        if validation["ok"]:
            return validation
        problems = validation["problems"]
    return {"ok": False, "problems": problems}


async def gather_claims(tasks, *, model, max_attempts):
    result = {"accepted": [], "quarantined": []}
    for task in tasks:
        validation = await run_task(task, model, max_attempts)
        if validation["ok"]:
            result["accepted"].extend({**claim, "taskId": task["id"]} for claim in validation["claims"])
        else:
            result["quarantined"].append({"taskId": task["id"], "problems": validation["problems"]})
    return result


async def ballot(model, voter, content):
    try:
        response = await model.generate({
            "messages": [
                {"role": "system", "content": voter_system(voter)},
                {"role": "user", "content": content},
            ],
            "responseFormat": {"type": "json"},
        })
    except ModelError:
        return None
    if response["finishReason"] != "stop":
        return None
    try:
        answer = field(json.loads(response["text"]), "answer")
    except ValueError:
        return None
    return answer.strip().lower() if isinstance(answer, str) and answer.strip() != "" else None


def winner(ballots, voters, quorum):
    counts = {}
    for answer in ballots:
        if answer is not None:
            counts[answer] = counts.get(answer, 0) + 1
    if not counts:
        return None
    best, count = max(counts.items(), key=lambda entry: entry[1])
    return best if count / voters >= quorum else None


async def vote_independently(question, *, model, voters, quorum):
    first = list(await asyncio.gather(*(ballot(model, voter, question) for voter in voters)))
    first_winner = winner(first, len(voters), quorum)
    if first_winner is not None:
        return {"status": "consensus", "decision": first_winner, "rounds": 1, "ballots": [first]}
    shared = "\n".join(f"- reviewer {index}: {'(abstained)' if answer is None else answer}" for index, answer in enumerate(first, start=1))
    discussion = f"{question}\n\nThe reviewers disagreed. Their independent answers were:\n{shared}\n\nReconsider the evidence and give your final answer."
    second = list(await asyncio.gather(*(ballot(model, voter, discussion) for voter in voters)))
    second_winner = winner(second, len(voters), quorum)
    status = "no_consensus" if second_winner is None else "consensus"
    return {"status": status, "decision": second_winner, "rounds": 2, "ballots": [first, second]}


class DelegationGuard:
    """Allows a delegation only when it makes no cycle and stays within the depth, fan-out and total limits."""

    def __init__(self, max_depth, max_fan_out, max_total):
        self.max_depth = max_depth
        self.max_fan_out = max_fan_out
        self.max_total = max_total
        self.children = {}
        self.total = 0

    def request(self, chain, target):
        if target in chain:
            return {"allowed": False, "reason": "cycle"}
        if len(chain) > self.max_depth:
            return {"allowed": False, "reason": "depth"}
        parent = "/".join(chain)
        if self.children.get(parent, 0) >= self.max_fan_out:
            return {"allowed": False, "reason": "fan_out"}
        if self.total >= self.max_total:
            return {"allowed": False, "reason": "total"}
        self.children[parent] = self.children.get(parent, 0) + 1
        self.total += 1
        return {"allowed": True}


def create_delegation_guard(*, max_depth, max_fan_out, max_total):
    return DelegationGuard(max_depth, max_fan_out, max_total)
