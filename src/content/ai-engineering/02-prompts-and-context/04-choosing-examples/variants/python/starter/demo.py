import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import classify_with_examples, example_tokens, select_examples

POOL = [
    {"id": "refund-late", "input": "My refund has not arrived after two weeks.", "output": "billing"},
    {"id": "refund-late-copy", "input": "My refund has NOT arrived after two weeks!", "output": "billing"},
    {"id": "refund-card", "input": "Where is the refund for my card payment?", "output": "billing"},
    {"id": "invoice-vat", "input": "The invoice shows the wrong VAT number.", "output": "billing"},
    {"id": "parcel-stuck", "input": "The parcel tracking has not moved for a week.", "output": "shipping"},
    {"id": "parcel-damaged", "input": "My parcel arrived damaged and the box was open.", "output": "shipping"},
    {"id": "password-reset", "input": "I cannot reset my password.", "output": "account"},
    {"id": "email-change", "input": "How do I change the email on my account?", "output": "account"},
    {"id": "export-crash", "input": "The export button crashes the app.", "output": "bug"},
    {"id": "blank-screen", "input": "The checkout page shows a blank screen.", "output": "bug"},
]
LABELS = ["billing", "shipping", "account", "bug"]
SYSTEM = "Classify the support ticket. Answer with one of: billing, shipping, account, bug."
QUERIES = ["When will my refund arrive?", "The parcel tracking page is stuck since Monday.", "The app crashes when I export a report."]


async def main():
    fake_model.reply(respond.text("Billing."), respond.text("shipping"), respond.text("I would say this is a bug"))
    model = create_model()
    for query in QUERIES:
        options = {"k": 3, "max_tokens": 60, "min_similarity": 0.3}
        chosen = select_examples(query, POOL, **options)
        tokens = sum(example_tokens(example) for example in chosen)
        print(f'"{query}"')
        for example in chosen:
            print(f"  {example['score']:.2f}  {example['id']:<16} {example['output']}")
        result = await classify_with_examples(model, system=SYSTEM, query=query, pool=POOL, labels=LABELS, **options)
        label = result["label"] if result["label"] is not None else "unrecognized, send to review"
        print(f"  {len(chosen)} examples, {tokens} tokens -> label: {label}\n")


if __name__ == "__main__":
    asyncio.run(main())
