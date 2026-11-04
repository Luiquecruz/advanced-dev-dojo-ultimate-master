from datetime import datetime, timezone

DAY = 86_400_000
START = int(datetime(2026, 1, 1, tzinfo=timezone.utc).timestamp() * 1000)


def day(offset):
    return START + offset * DAY


class Clock:
    def __init__(self, start_day=0):
        self.time = day(start_day)

    def now(self):
        return self.time

    def set(self, offset):
        self.time = day(offset)
        return self.time


def memory(start_day=0):
    clock = Clock(start_day)
    return clock, mod.create_temporal_memory(now=clock.now, exclusive_predicates=["works_at", "lives_in"])


def objects(facts):
    return sorted(fact["object"] for fact in facts)


def seeded_random(seed):
    state = seed % 4294967296

    def random():
        nonlocal state
        state = (state * 1664525 + 1013904223) % 4294967296
        return state / 4294967296

    return random


def contains(record, expected):
    return all(key in record and record[key] == value for key, value in expected.items())


@test("add records valid time and transaction time, and non-exclusive predicates accumulate")
def _():
    clock, graph = memory(3)
    acme = graph.add({"subject": "ana", "predicate": "works_at", "object": "Acme", "validFrom": day(0)})
    assert acme == {"id": acme["id"], "subject": "ana", "predicate": "works_at", "object": "Acme", "validFrom": day(0), "validTo": None, "recordedAt": day(3), "expiredAt": None}
    assert isinstance(acme["id"], str)
    graph.add({"subject": "ana", "predicate": "likes", "object": "cycling", "validFrom": day(1)})
    graph.add({"subject": "ana", "predicate": "likes", "object": "hiking", "validFrom": day(2)})
    assert objects(graph.current("ana", "likes")) == ["cycling", "hiking"]
    assert objects(graph.current("ana")) == ["Acme", "cycling", "hiking"]
    assert graph.current("ben") == []


@test("is_valid_at and is_known_at use half-open intervals, with None meaning still open")
def _():
    fact = {"id": "f", "subject": "ana", "predicate": "works_at", "object": "Acme", "validFrom": day(10), "validTo": day(20), "recordedAt": day(12), "expiredAt": day(30)}
    assert [mod.is_valid_at(fact, moment) for moment in [day(9), day(10), day(19), day(20)]] == [False, True, True, False]
    assert [mod.is_known_at(fact, moment) for moment in [day(11), day(12), day(29), day(30)]] == [False, True, True, False]
    open_fact = {**fact, "validTo": None, "expiredAt": None}
    assert mod.is_valid_at(open_fact, day(5000)) is True
    assert mod.is_known_at(open_fact, day(5000)) is True


@test("a contradiction on an exclusive predicate invalidates the old fact instead of deleting it")
def _():
    clock, graph = memory(1)
    acme = graph.add({"subject": "ana", "predicate": "works_at", "object": "Acme", "validFrom": day(0)})
    clock.set(68)
    globex = graph.add({"subject": "ana", "predicate": "works_at", "object": "Globex", "validFrom": day(59)})
    records = graph.all()
    assert len(records) == 3
    assert next(fact for fact in records if fact["id"] == acme["id"]) == {**acme, "expiredAt": day(68)}
    closed = next(fact for fact in records if fact["object"] == "Acme" and fact["id"] != acme["id"])
    assert closed == {"id": closed["id"], "subject": "ana", "predicate": "works_at", "object": "Acme", "validFrom": day(0), "validTo": day(59), "recordedAt": day(68), "expiredAt": None}
    assert contains(globex, {"object": "Globex", "validFrom": day(59), "validTo": None, "recordedAt": day(68), "expiredAt": None})
    assert objects(graph.current("ana", "works_at")) == ["Globex"]
    assert len({fact["id"] for fact in records}) == 3


@test("as_of answers what was true at a valid time and what the memory believed at a transaction time")
def _():
    clock, graph = memory(1)
    graph.add({"subject": "ana", "predicate": "works_at", "object": "Acme", "validFrom": day(0)})
    clock.set(68)
    graph.add({"subject": "ana", "predicate": "works_at", "object": "Globex", "validFrom": day(59)})
    clock.set(100)
    assert objects(graph.as_of("ana", "works_at", day(45))) == ["Acme"]
    assert objects(graph.as_of("ana", "works_at", day(59))) == ["Globex"]
    assert objects(graph.as_of("ana", "works_at", day(90))) == ["Globex"]
    assert graph.as_of("ana", "works_at", day(-5)) == []
    assert objects(graph.as_of("ana", "works_at", day(64), day(64))) == ["Acme"]
    assert graph.as_of("ana", "works_at", day(64), day(64))[0]["validTo"] is None
    assert objects(graph.as_of("ana", "works_at", day(64), day(68))) == ["Globex"]
    assert graph.as_of("ana", "works_at", day(0), day(0)) == []


@test("restating a fact changes nothing, a late fact about the past ends where newer knowledge starts, and a same-time statement corrects")
def _():
    clock, graph = memory(160)
    porto = graph.add({"subject": "ana", "predicate": "lives_in", "object": "Porto", "validFrom": day(150)})
    clock.set(170)
    assert graph.add({"subject": "ana", "predicate": "lives_in", "object": "Porto", "validFrom": day(165)})["id"] == porto["id"]
    assert len(graph.all()) == 1

    clock.set(180)
    lisbon = graph.add({"subject": "ana", "predicate": "lives_in", "object": "Lisbon", "validFrom": day(0)})
    assert lisbon["validTo"] == day(150)
    assert next(fact for fact in graph.all() if fact["id"] == porto["id"]) == porto
    assert objects(graph.current("ana", "lives_in")) == ["Porto"]
    assert objects(graph.as_of("ana", "lives_in", day(100))) == ["Lisbon"]

    clock.set(190)
    graph.add({"subject": "ana", "predicate": "lives_in", "object": "Braga", "validFrom": day(150)})
    assert next(fact for fact in graph.all() if fact["id"] == porto["id"])["expiredAt"] == day(190)
    assert len([fact for fact in graph.all() if fact["object"] == "Porto"]) == 1
    assert objects(graph.current("ana", "lives_in")) == ["Braga"]
    assert objects(graph.as_of("ana", "lives_in", day(160), day(185))) == ["Porto"]


@test("over random histories nothing is deleted, exclusive facts never overlap, and past answers never change")
def _():
    subjects = ["ana", "ben"]
    predicates = ["works_at", "lives_in", "likes"]
    values = ["Acme", "Globex", "Initech", "Lisbon", "Porto", "jazz"]
    probes = [day(offset) for offset in [0, 15, 30, 45, 60, 75, 90]]
    infinity = float("inf")
    for seed in range(1, 13):
        random = seeded_random(seed)
        clock, graph = memory(0)
        snapshots = []
        record_count = 0

        def answers_at(known_at):
            return [
                sorted(fact["id"] for fact in graph.as_of(subject, predicate, valid_at, known_at))
                for subject in subjects
                for predicate in predicates
                for valid_at in probes
            ]

        for step in range(1, 41):
            clock.set(step * 3)
            subject = subjects[int(random() * len(subjects))]
            predicate = predicates[int(random() * len(predicates))]
            value = values[int(random() * len(values))]
            valid_from = day(int(random() * 90))
            graph.add({"subject": subject, "predicate": predicate, "object": value, "validFrom": valid_from})
            records = graph.all()
            assert len(records) >= record_count, f"seed {seed}, step {step}"
            record_count = len(records)
            snapshots.append((day(step * 3), answers_at(day(step * 3))))
            for checked_subject in subjects:
                for checked_predicate in ["works_at", "lives_in"]:
                    believed = [
                        fact
                        for fact in records
                        if fact["subject"] == checked_subject and fact["predicate"] == checked_predicate and fact["expiredAt"] is None
                    ]
                    for left in believed:
                        for right in believed:
                            if left["id"] != right["id"]:
                                left_end = infinity if left["validTo"] is None else left["validTo"]
                                right_end = infinity if right["validTo"] is None else right["validTo"]
                                overlap = left["validFrom"] < right_end and right["validFrom"] < left_end
                                assert overlap is False, f"seed {seed}, step {step}: {left['id']} overlaps {right['id']}"
        for known_at, answers in snapshots:
            assert answers_at(known_at) == answers, f"seed {seed}, known at {known_at}"
