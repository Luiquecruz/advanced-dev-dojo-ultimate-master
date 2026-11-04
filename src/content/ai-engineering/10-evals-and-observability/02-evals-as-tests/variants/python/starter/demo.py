import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import exact_scorer, run_eval, schema_scorer, semantic_scorer

TICKET_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"enum": ["billing", "shipping", "account"]},
        "priority": {"type": "integer", "minimum": 1, "maximum": 3},
    },
    "required": ["category", "priority"],
}

TRIAGE_SET = [
    {"id": "vat-number", "input": "My invoice shows the wrong VAT number.", "expected": "billing"},
    {"id": "stuck-parcel", "input": "The parcel tracking has not moved for a week.", "expected": "shipping"},
    {"id": "password-reset", "input": "I cannot reset my password.", "expected": "account"},
    {"id": "double-charge", "input": "I was charged twice for one order.", "expected": "billing"},
]

ANSWER_SET = [
    {"id": "refund-timing", "input": "When do I get my money back?", "expected": "Refunds reach the original card within 5 business days."},
    {"id": "return-window", "input": "How long do I have to return shoes?", "expected": "You can return shoes within 30 days of delivery."},
]


def prompt_for(system):
    def prompt(eval_case):
        return {"messages": [{"role": "system", "content": system}, {"role": "user", "content": eval_case["input"]}]}

    return prompt


def print_report(title, report):
    print(f"\n{title}")
    for result in report["cases"]:
        verdict = "PASS" if result["pass"] else "FAIL"
        reason = result["error"] if result["error"] is not None else " | ".join(f"{name}: {score['detail']}" for name, score in result["scores"].items())
        print(f"  {verdict}  {result['id']:<15} {reason}")
    summary = report["summary"]
    print(f"  {summary['passed']}/{summary['total']} passed ({round(summary['passRate'] * 100)}%), {summary['errored']} model error(s)")


async def main():
    model = create_model()

    fake_model.reply(respond.text("Billing."), respond.text("account"), respond.text("account"), respond.error(503))
    print_report(
        "Triage labels (exact)",
        await run_eval(model=model, dataset=TRIAGE_SET, prompt=prompt_for("Answer with one category: billing, shipping or account."), scorers=[exact_scorer()]),
    )

    fake_model.reply(
        respond.json({"category": "billing", "priority": 2}),
        respond.malformed_json({"category": "shipping", "priority": 1}),
        respond.json({"category": "login", "priority": 1}),
        respond.json({"category": "billing", "priority": 3}),
    )
    print_report(
        "Triage JSON (schema)",
        await run_eval(model=model, dataset=TRIAGE_SET, prompt=prompt_for('Reply with JSON: {"category", "priority"}.'), scorers=[schema_scorer(TICKET_SCHEMA)]),
    )

    fake_model.reply(respond.text("Your refund reaches the card you paid with in 5 business days."), respond.text("Please contact our store for more details."))
    print_report(
        "Policy answers (semantic, threshold 0.6)",
        await run_eval(model=model, dataset=ANSWER_SET, prompt=prompt_for("Answer from the return policy."), scorers=[semantic_scorer(threshold=0.6)]),
    )


if __name__ == "__main__":
    asyncio.run(main())
