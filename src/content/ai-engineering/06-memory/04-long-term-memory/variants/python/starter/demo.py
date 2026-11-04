import asyncio
from datetime import datetime, timezone

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import create_memory_store, extract_candidates

HOUR = 3_600_000

SESSIONS = [
    {
        "hoursLater": 0,
        "transcript": "user: Book me a flight to Lisbon. I always take aisle seats, and I am allergic to peanuts.",
        "reply": respond.json({
            "memories": [
                {"text": "The user always takes aisle seats on flights", "importance": 5},
                {"text": "The user is allergic to peanuts", "importance": 9},
                {"text": "The user said hello", "importance": 1},
            ],
        }),
    },
    {
        "hoursLater": 26,
        "transcript": "user: Find a vegan restaurant near the hotel for tonight.",
        "reply": respond.malformed_json({"memories": [{"text": "The user prefers vegan restaurants", "importance": 6}]}),
    },
    {
        "hoursLater": 80,
        "transcript": "user: Aisle seat again please. And I prefer vegan restaurants when we travel.",
        "reply": respond.json({
            "memories": [
                {"text": "The user always takes aisle seats on flights", "importance": 6},
                {"text": "The user prefers vegan restaurants when traveling", "importance": 6},
            ],
        }),
    },
]


async def main():
    clock = {"time": int(datetime(2026, 10, 1, 9, 0, 0, tzinfo=timezone.utc).timestamp() * 1000)}
    memory = create_memory_store(now=lambda: clock["time"], decay_per_hour=0.99)
    model = create_model()
    elapsed = 0

    for session in SESSIONS:
        clock["time"] += (session["hoursLater"] - elapsed) * HOUR
        elapsed = session["hoursLater"]
        fake_model.reply(session["reply"])
        candidates = await extract_candidates(model, session["transcript"])
        outcome = "no usable candidates (malformed or refused), nothing stored" if not candidates else f"{len(candidates)} candidates"
        print(f"hour {str(session['hoursLater']).rjust(3)}: {outcome}")
        for candidate in candidates:
            result = memory.write(candidate)
            print(f"  {result['action'].ljust(7)} {candidate['text']} (importance {candidate['importance']})")

    clock["time"] += 48 * HOUR
    query = "Book a restaurant for Friday dinner in Porto"
    print(f'\nStored memories: {len(memory.all())}. Query two days later: "{query}"')
    print("score  relevance  recency  importance  memory")
    for result in memory.retrieve(query, 3):
        columns = [f"{value:5.2f}" for value in (result["score"], result["relevance"], result["recency"], result["importance"])]
        print(f"{columns[0]}  {columns[1]}      {columns[2]}    {columns[3]}       {result['memory']['text']}")


if __name__ == "__main__":
    asyncio.run(main())
