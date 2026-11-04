import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import answer_with_citations, build_context
from passages import RETRIEVED

model = create_model()


def show(label, result):
    print(f"\n{label}: {result['status']} after {result['attempts']} model call(s)")
    if result["answer"] is not None:
        print(f"  answer: {result['answer']}")
    for citation in result["citations"]:
        print(f"  [{citation['number']}] {citation['id']} ({citation['source']})")


async def main():
    question = "When will my annual plan refund reach my card?"
    print(f"Context sent to the model:\n{build_context(RETRIEVED)['context']}")

    fake_model.reply(respond.text("Annual plans are refundable within 30 days [2], and refunds reach the original card within 5 to 10 business days [1]."))
    show("Grounded answer", await answer_with_citations(model, question, RETRIEVED))

    fake_model.reply(respond.text("Refunds take 5 to 10 business days [1] and are always paid in cash [5]."), respond.text("Refunds reach the original card within 5 to 10 business days [1]."))
    show("Invented citation, repaired on the second call", await answer_with_citations(model, question, RETRIEVED))

    fake_model.reply(respond.text("Probably about a week."), respond.text("I think it is about a week."))
    show("No citations twice, answer withheld", await answer_with_citations(model, question, RETRIEVED))

    off_topic = [{**passage, "score": 0.05} for passage in RETRIEVED]
    show("Off-topic question, nothing above the threshold", await answer_with_citations(model, "Who won the 1998 World Cup?", off_topic))


if __name__ == "__main__":
    asyncio.run(main())
