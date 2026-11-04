import inspect
import json
import re

from dojo_ai import cosine_similarity, embed
from validation import safe_parse


def normalize_answer(text):
    # TODO: lowercase, strip whitespace and . , ! ? " ' at both ends, collapse inner whitespace
    return text


class ExactScorer:
    """Passes when the normalized output equals the normalized expected value."""

    name = "exact"

    def score(self, output, eval_case):
        # TODO: compare normalized output and expected; fail with a detail; raise when the case has no expected value
        passed = output == eval_case.get("expected")
        return {"pass": passed, "score": 1 if passed else 0, "detail": ""}


class SchemaScorer:
    """Passes when the output is strict JSON that matches the JSON Schema."""

    name = "schema"

    def __init__(self, schema):
        self.schema = schema

    def score(self, output, eval_case):
        # TODO: parse the output strictly with json.loads, validate it with safe_parse and explain every failure
        raise NotImplementedError("schema scorer")


class SemanticScorer:
    """Scores the embedding similarity between output and expected value and passes at or above the threshold."""

    name = "semantic"

    def __init__(self, threshold):
        self.threshold = threshold

    def score(self, output, eval_case):
        # TODO: cosine similarity of embed(output) and embed(expected), pass at or above the threshold
        raise NotImplementedError("semantic scorer")


def exact_scorer():
    return ExactScorer()


def schema_scorer(schema):
    return SchemaScorer(schema)


def semantic_scorer(*, threshold):
    return SemanticScorer(threshold)


async def run_eval(*, model, dataset, prompt, scorers):
    # TODO: run cases one at a time; a model error fails its case, a raising scorer fails its score; build the summary
    cases = []
    for eval_case in dataset:
        output = (await model.generate(prompt(eval_case)))["text"]
        scores = {}
        for scorer in scorers:
            result = scorer.score(output, eval_case)
            scores[scorer.name] = await result if inspect.isawaitable(result) else result
        cases.append({"id": eval_case["id"], "output": output, "error": None, "scores": scores, "pass": all(score["pass"] for score in scores.values())})
    passed = sum(1 for result in cases if result["pass"])
    summary = {"total": len(cases), "passed": passed, "failed": len(cases) - passed, "errored": 0, "passRate": passed / len(cases), "byScorer": {}}
    return {"cases": cases, "summary": summary}
