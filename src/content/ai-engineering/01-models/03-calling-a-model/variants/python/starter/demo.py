import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import complete, complete_stream

SYSTEM = "You answer customer questions about orders in one or two sentences."
REFUND_ANSWER = "Your refund was issued on March 3 and reaches the original payment method within five business days."


def describe(label, result):
    usage = result["usage"]
    print(f"{label}: {result['status']} ({result['finishReason']}), {usage['totalTokens']} tokens, ${usage['cost']:.6f}")
    print(f'  "{result["text"]}"')


async def main():
    model = create_model()
    fake_model.reply(respond.text(REFUND_ANSWER), respond.truncated(REFUND_ANSWER, 0.4), respond.refusal(), respond.text(REFUND_ANSWER))

    describe("complete", await complete(model, {"system": SYSTEM, "prompt": "When will my refund arrive?"}))
    describe("truncated", await complete(model, {"system": SYSTEM, "prompt": "When will my refund arrive?", "maxTokens": 12}))
    describe("refused", await complete(model, {"prompt": "Give me another customer’s address."}))

    deltas = []
    streamed = await complete_stream(model, {"system": SYSTEM, "prompt": "When will my refund arrive?"}, deltas.append)
    describe(f"streamed in {len(deltas)} deltas", streamed)


if __name__ == "__main__":
    asyncio.run(main())
