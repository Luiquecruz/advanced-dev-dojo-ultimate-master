import time


def current_time_ms():
    return time.time() * 1000


def is_valid_at(fact, valid_at):
    # TODO: true from validFrom (inclusive) until validTo (exclusive); a None validTo is still true
    return fact["validFrom"] <= valid_at


def is_known_at(fact, known_at):
    # TODO: true from recordedAt (inclusive) until expiredAt (exclusive); a None expiredAt is still believed
    return True


class TemporalMemory:
    """Append-only bi-temporal fact store: valid time for the world, transaction time for the memory's belief."""

    def __init__(self, now=current_time_ms, exclusive_predicates=None):
        self.now = now
        self.exclusive = set(exclusive_predicates or [])
        self.facts = []
        self.created = 0

    def add(self, input):
        # TODO: ignore restated facts; for exclusive predicates expire contradicted facts and record closed copies instead of deleting them
        if input["predicate"] in self.exclusive:
            self.facts = [fact for fact in self.facts if not (fact["subject"] == input["subject"] and fact["predicate"] == input["predicate"])]
        self.created += 1
        fact = {**input, "id": f"fact-{self.created}", "validTo": None, "recordedAt": self.now(), "expiredAt": None}
        self.facts.append(fact)
        return dict(fact)

    def current(self, subject, predicate=None):
        # TODO: only believed facts (expiredAt None) that are still true (validTo None)
        return [dict(fact) for fact in self.facts if fact["subject"] == subject and (predicate is None or fact["predicate"] == predicate)]

    def as_of(self, subject, predicate, valid_at, known_at=None):
        moment = self.now() if known_at is None else known_at
        return [
            dict(fact)
            for fact in self.facts
            if fact["subject"] == subject and fact["predicate"] == predicate and is_valid_at(fact, valid_at) and is_known_at(fact, moment)
        ]

    def all(self):
        return [dict(fact) for fact in self.facts]


def create_temporal_memory(now=current_time_ms, exclusive_predicates=None):
    return TemporalMemory(now, exclusive_predicates)
