import asyncio

from dojo_ai import count_tokens, create_model
from dojo_ai.testing import fake_model, respond

from main import create_conversation_memory

TURNS = [
    {"role": "user", "content": "Hi, I want to rent two e-bikes for Saturday morning."},
    {"role": "assistant", "content": "Sure. Which station do you want to pick them up from?"},
    {"role": "user", "content": "The harbour station, around 9:00. We are two adults."},
    {"role": "assistant", "content": "Booked: two e-bikes at the harbour station, Saturday 9:00, booking B-1042."},
    {"role": "user", "content": "Do helmets come included or do we pay extra?"},
    {"role": "assistant", "content": "Helmets are included. Child seats cost 5 euros per day."},
    {"role": "user", "content": "Great. Can I change the pickup to 10:30 instead?"},
    {"role": "assistant", "content": "Done: booking B-1042 now starts at 10:30."},
    {"role": "user", "content": "If it rains, can I get a refund?"},
    {"role": "assistant", "content": "Yes, cancellations up to two hours before pickup are refunded in full."},
    {"role": "user", "content": "So what time do we pick up the bikes, and where?"},
]

SUMMARIES = [
    "The customer wants to rent two e-bikes for Saturday morning.",
    "Booking B-1042: two e-bikes at the harbour station, Saturday 9:00, for two adults.",
    "Booking B-1042: two e-bikes at the harbour station, Saturday 9:00, for two adults. Helmets are included; child seats cost 5 euros a day.",
    "Booking B-1042: two e-bikes at the harbour station, Saturday, pickup moved to 10:30. Helmets included; child seats 5 euros a day.",
    "Booking B-1042: two e-bikes, harbour station, Saturday 10:30. Helmets included. Full refund if cancelled up to two hours before pickup.",
]


def reply_for(request, context):
    if context.call_index == 1:
        return respond.refusal()
    successful_calls = 0 if context.call_index == 0 else context.call_index - 1
    return respond.text(SUMMARIES[min(successful_calls, len(SUMMARIES) - 1)])


async def main():
    fake_model.handle(reply_for)
    memory = create_conversation_memory(
        create_model(),
        "You are the support assistant of a bike rental shop. Answer briefly.",
        max_tokens=110,
        keep_recent=2,
        summary_max_tokens=80,
    )

    print("Budget: 110 tokens per call, the latest 2 messages always kept.\n")
    for index, turn in enumerate(TURNS):
        memory.add(turn)
        requests_before = len(fake_model.requests)
        compacted = await memory.compact()
        attempted = len(fake_model.requests) > requests_before
        if compacted["summarized"]:
            event = f"folded {compacted['folded']} message{'' if compacted['folded'] == 1 else 's'} into the summary"
        else:
            event = "summary failed, history kept" if attempted else "fits"
        tokens = str(count_tokens(memory.context())).rjust(3)
        kept = str(len(memory.state()["history"])).rjust(2)
        print(f"turn {str(index + 1).rjust(2)}  context {tokens} tokens  history {kept}  {event}")

    print("\nRunning summary:", memory.state()["summary"])
    print("Messages sent with the last question:")
    for message in memory.context():
        print(f"  {message['role'].ljust(9)} {message['content']}")


if __name__ == "__main__":
    asyncio.run(main())
