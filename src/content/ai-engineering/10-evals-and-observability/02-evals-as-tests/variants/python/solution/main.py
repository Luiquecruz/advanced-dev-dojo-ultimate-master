import inspect
import json
import re

from dojo_ai import cosine_similarity, embed
from validation import safe_parse

EDGE_NOISE = re.compile(r"^[\s.,!?\"']+|[\s.,!?\"']+$")


def normalize_answer(text):
    return re.sub(r"\s+", " ", EDGE_NOISE.sub("", text.lower()))


def expected_text(eval_case, scorer_name):
    if eval_case.get("expected") is None:
        raise ValueError(f'Case "{eval_case["id"]}" has no expected value for the {scorer_name} scorer')
    return str(eval_case["expected"])


class ExactScorer:
    """Passes when the normalized output equals the normalized expected value."""

    name = "exact"

    def score(self, output, eval_case):
        expected = normalize_answer(expected_text(eval_case, self.name))
        actual = normalize_answer(output)
        if actual == expected:
            return {"pass": True, "score": 1, "detail": "exact match"}
        return {"pass": False, "score": 0, "detail": f'expected "{expected}", got "{actual}"'}


class SchemaScorer:
    """Passes when the output is strict JSON that matches the JSON Schema."""

    name = "schema"

    def __init__(self, schema):
        self.schema = schema

    def score(self, output, eval_case):
        try:
            value = json.loads(output.strip())
        except ValueError as error:
            return {"pass": False, "score": 0, "detail": f"invalid JSON: {error}"}
        result = safe_parse(self.schema, value)
        if not result["success"]:
            issues = [f"{'.'.join(str(part) for part in issue['path']) or '(root)'}: {issue['message']}" for issue in result["issues"]]
            return {"pass": False, "score": 0, "detail": "; ".join(issues)}
        return {"pass": True, "score": 1, "detail": "matches the schema"}


class SemanticScorer:
    """Scores the embedding similarity between output and expected value and passes at or above the threshold."""

    name = "semantic"

    def __init__(self, threshold):
        self.threshold = threshold

    def score(self, output, eval_case):
        similarity = cosine_similarity(embed(output), embed(expected_text(eval_case, self.name)))
        return {"pass": similarity >= self.threshold, "score": similarity, "detail": f"similarity {similarity:.2f} (threshold {self.threshold})"}


def exact_scorer():
    return ExactScorer()


def schema_scorer(schema):
    return SchemaScorer(schema)


def semantic_scorer(*, threshold):
    return SemanticScorer(threshold)


async def score_safely(scorer, output, eval_case):
    try:
        result = scorer.score(output, eval_case)
        return await result if inspect.isawaitable(result) else result
    except Exception as error:
        return {"pass": False, "score": 0, "detail": f"scorer failed: {error}"}


async def run_case(model, prompt, scorers, eval_case):
    try:
        output = (await model.generate(prompt(eval_case)))["text"]
    except Exception as error:
        return {"id": eval_case["id"], "output": None, "error": str(error) or type(error).__name__, "scores": {}, "pass": False}
    scores = {}
    for scorer in scorers:
        scores[scorer.name] = await score_safely(scorer, output, eval_case)
    return {"id": eval_case["id"], "output": output, "error": None, "scores": scores, "pass": all(score["pass"] for score in scores.values())}


def summarize(cases, scorers):
    total = len(cases)
    passed = sum(1 for result in cases if result["pass"])
    by_scorer = {}
    for scorer in scorers:
        scores = [result["scores"].get(scorer.name) for result in cases]
        scorer_passed = sum(1 for score in scores if score is not None and score["pass"])
        score_sum = sum(score["score"] for score in scores if score is not None)
        by_scorer[scorer.name] = {
            "passed": scorer_passed,
            "total": total,
            "passRate": 0 if total == 0 else scorer_passed / total,
            "meanScore": 0 if total == 0 else score_sum / total,
        }
    return {
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "errored": sum(1 for result in cases if result["error"] is not None),
        "passRate": 0 if total == 0 else passed / total,
        "byScorer": by_scorer,
    }


async def run_eval(*, model, dataset, prompt, scorers):
    cases = []
    for eval_case in dataset:
        cases.append(await run_case(model, prompt, scorers, eval_case))
    return {"cases": cases, "summary": summarize(cases, scorers)}
