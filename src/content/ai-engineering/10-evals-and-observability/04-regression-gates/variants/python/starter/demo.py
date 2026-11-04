import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import compare_runs, evaluate_variant

DATASET = [
    {"id": "vat-number", "input": "My invoice shows the wrong VAT number.", "expected": "billing"},
    {"id": "stuck-parcel", "input": "The parcel tracking has not moved for a week.", "expected": "shipping"},
    {"id": "double-charge", "input": "I was charged twice for one order.", "expected": "billing", "critical": True},
    {"id": "password-reset", "input": "I cannot reset my password.", "expected": "account"},
    {"id": "wrong-address", "input": "Can I change the delivery address of my order?", "expected": "shipping"},
]


def variant(name, system):
    return {
        "name": name,
        "model": create_model(name),
        "prompt": lambda eval_case: {"messages": [{"role": "system", "content": system}, {"role": "user", "content": eval_case["input"]}]},
    }


def score(output, eval_case):
    return output.strip().lower() == eval_case["expected"]


def triage_behavior(request, context):
    input_text = request["messages"][-1]["content"]
    expected = next(eval_case for eval_case in DATASET if eval_case["input"] == input_text)["expected"]
    if request["model"] == "triage-v2" and "charged twice" in input_text:
        return respond.sometimes(0.5, respond.text("billing"), respond.text("shipping"))
    if request["model"] != "triage-v3" and "address" in input_text:
        return respond.sometimes(0.6, respond.text("shipping"), respond.text("account"))
    return respond.text([expected, expected.capitalize()])


def print_gate(baseline, candidate, gate):
    print(f"\n{baseline['variant']} vs {candidate['variant']} ({candidate['repeats']} runs per case)")
    for before in baseline["cases"]:
        after = next(result for result in candidate["cases"] if result["id"] == before["id"])
        marker = " (critical)" if before["critical"] else ""
        print(f"  {before['id'] + marker:<26} {before['passes']}/{before['runs']} -> {after['passes']}/{after['runs']}")
    print(f"  pass rate {baseline['passRate']:.2f} -> {candidate['passRate']:.2f}, flaky in candidate: {', '.join(candidate['flaky']) or 'none'}")
    print(f"  decision: {gate['decision'].upper()}" + "".join(f"\n    - {reason}" for reason in gate["reasons"]))


async def main():
    fake_model.seed(3).handle(triage_behavior)

    options = {"dataset": DATASET, "score": score, "repeats": 5}
    baseline = await evaluate_variant(variant("triage-v1", "Classify the ticket as billing, shipping or account."), **options)
    shorter_prompt = await evaluate_variant(variant("triage-v2", "Category? billing/shipping/account"), **options)
    print_gate(baseline, shorter_prompt, compare_runs(baseline, shorter_prompt, tolerance=0.05, case_tolerance=0.2))

    with_examples = await evaluate_variant(variant("triage-v3", "Classify the ticket as billing, shipping or account. Examples: ..."), **options)
    print_gate(baseline, with_examples, compare_runs(baseline, with_examples, tolerance=0.05, case_tolerance=0.2))


if __name__ == "__main__":
    asyncio.run(main())
