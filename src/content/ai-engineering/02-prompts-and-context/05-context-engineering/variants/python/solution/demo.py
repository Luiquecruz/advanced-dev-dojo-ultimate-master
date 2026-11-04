import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import answer_with_context

SYSTEM = 'You are the Parcelly help assistant. Answer only from the documents and say "I do not know" when they do not cover the question.'
DOCUMENTS = [
    {"id": "refunds", "score": 0.91, "text": "Refunds for damaged parcels are issued within five business days after the claim is approved. Claims need a photo of the damage. Refunds go back to the original payment method."},
    {"id": "claims", "score": 0.84, "text": "To open a damage claim, go to Orders, choose the parcel and press Report a problem. Claims must be opened within 14 days of delivery."},
    {"id": "policy", "score": 0.72, "text": "The general terms cover every parcel sent with Parcelly. " * 4 + "Liability for damage is limited to the declared value of the parcel. " * 12},
    {"id": "shipping", "score": 0.4, "text": "Standard shipping takes two to four business days within the EU."},
    {"id": "careers", "score": 0.05, "text": "Parcelly is hiring couriers in Lisbon and Porto."},
]
HISTORY = [
    {"role": "user", "content": "Hi, my parcel 2210 arrived today."},
    {"role": "assistant", "content": "Thanks for letting us know. How can I help with parcel 2210?"},
    {"role": "user", "content": "The box was crushed and the vase inside is broken."},
    {"role": "assistant", "content": "I am sorry to hear that. I can help you with a damage claim."},
    {"role": "user", "content": "Do I need to keep the box?"},
    {"role": "assistant", "content": "Yes, please keep the box and the packaging until the claim is closed."},
]


async def main():
    for context_window in [32000, 330, 230]:
        fake_model.reset().configure(context_window=context_window)
        fake_model.reply(respond.text("Yes. Open a claim within 14 days with a photo; the refund arrives within five business days."))
        context_input = {
            "system": SYSTEM,
            "history": HISTORY,
            "question": "Can I get a refund for a damaged parcel?",
            "documents": DOCUMENTS,
            "min_score": 0.2,
            "max_document_tokens": 60,
        }
        result = await answer_with_context(create_model(), context_input, 80)
        context = result["context"]
        included = ", ".join(context["includedDocumentIds"]) or "none"
        dropped = ", ".join(context["droppedDocumentIds"])
        compressed = ", ".join(context["compressedDocumentIds"]) or "none"
        print(f"context window {context_window}, output reserve 80 -> {context['tokens']} input tokens")
        print(f"  documents: {included} | dropped: {dropped} | compressed: {compressed}")
        print(f"  history: {context['keptTurns']} turns kept, {context['droppedTurns']} dropped")
        print(f"  answer: {result['text']}")


if __name__ == "__main__":
    asyncio.run(main())
