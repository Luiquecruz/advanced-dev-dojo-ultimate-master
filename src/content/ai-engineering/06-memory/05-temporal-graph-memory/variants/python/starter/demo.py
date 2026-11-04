from datetime import datetime, timezone

from dojo_ai import cosine_similarity, embed

from main import create_temporal_memory

DAY = 86_400_000
START = int(datetime(2026, 1, 1, tzinfo=timezone.utc).timestamp() * 1000)


def day(offset):
    return START + offset * DAY


def date(moment):
    return datetime.fromtimestamp(moment / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


EPISODES = [
    {"learnedOn": 2, "sentence": "Ana works at Acme.", "fact": {"subject": "ana", "predicate": "works_at", "object": "Acme", "validFrom": day(0)}},
    {"learnedOn": 5, "sentence": "Ana lives in Lisbon.", "fact": {"subject": "ana", "predicate": "lives_in", "object": "Lisbon", "validFrom": day(0)}},
    {"learnedOn": 68, "sentence": "Ana works at Globex since March 1.", "fact": {"subject": "ana", "predicate": "works_at", "object": "Globex", "validFrom": day(59)}},
    {"learnedOn": 70, "sentence": "Ana likes jazz.", "fact": {"subject": "ana", "predicate": "likes", "object": "jazz", "validFrom": day(70)}},
    {"learnedOn": 75, "sentence": "Ana works at Acme.", "fact": {"subject": "ana", "predicate": "works_at", "object": "Acme", "validFrom": day(0)}},
]


def flat_answer(sentences, question):
    query = embed(question)
    ranked = sorted(
        ({"sentence": sentence, "score": cosine_similarity(query, embed(sentence))} for sentence in sentences),
        key=lambda entry: entry["score"],
        reverse=True,
    )
    return ", ".join(f'"{entry["sentence"]}" ({entry["score"]:.2f})' for entry in ranked[:2])


def objects_of(facts):
    return ", ".join(fact["object"] for fact in facts)


def main():
    clock = {"time": day(0)}
    graph = create_temporal_memory(now=lambda: clock["time"], exclusive_predicates=["works_at", "lives_in"])
    sentences = []

    for episode in EPISODES:
        clock["time"] = day(episode["learnedOn"])
        sentences.append(episode["sentence"])
        fact = graph.add(episode["fact"])
        until = "" if fact["validTo"] is None else f" to {date(fact['validTo'])}"
        print(f'{date(clock["time"])} learned "{episode["sentence"]}" -> {fact["object"]} valid from {date(fact["validFrom"])}{until}')

    clock["time"] = day(90)
    question = "Where does Ana work?"
    print(f'\nFlat vector memory, top 2 for "{question}": {flat_answer(sentences, question)}')
    print(f"Temporal graph, current: {objects_of(graph.current('ana', 'works_at'))}")
    print(f"Temporal graph, true on {date(day(45))}: {objects_of(graph.as_of('ana', 'works_at', day(45)))}")
    print(f"Temporal graph, believed on {date(day(64))} about {date(day(64))}: {objects_of(graph.as_of('ana', 'works_at', day(64), day(64)))}")

    print("\nEvery record, nothing deleted:")
    for fact in graph.all():
        valid = f"{date(fact['validFrom'])} .. {'now' if fact['validTo'] is None else date(fact['validTo'])}"
        known = f"{date(fact['recordedAt'])} .. {'now' if fact['expiredAt'] is None else date(fact['expiredAt'])}"
        print(f"  {fact['predicate'].ljust(8)} {fact['object'].ljust(7)} valid {valid}   known {known}")


if __name__ == "__main__":
    main()
