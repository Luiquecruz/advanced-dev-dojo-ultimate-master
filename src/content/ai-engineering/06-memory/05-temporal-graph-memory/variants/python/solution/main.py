import time


def current_time_ms():
    return time.time() * 1000


def is_valid_at(fact, valid_at):
    return fact["validFrom"] <= valid_at and (fact["validTo"] is None or valid_at < fact["validTo"])


def is_known_at(fact, known_at):
    return fact["recordedAt"] <= known_at and (fact["expiredAt"] is None or known_at < fact["expiredAt"])


class TemporalMemory:
    """Append-only bi-temporal fact store: valid time for the world, transaction time for the memory's belief."""

    def __init__(self, now=current_time_ms, exclusive_predicates=None):
        self.now = now
        self.exclusive = set(exclusive_predicates or [])
        self.facts = []
        self.created = 0

    def believed(self):
        return [fact for fact in self.facts if fact["expiredAt"] is None]

    def record(self, source, valid_to, recorded_at):
        self.created += 1
        fact = {
            "subject": source["subject"],
            "predicate": source["predicate"],
            "object": source["object"],
            "validFrom": source["validFrom"],
            "id": f"fact-{self.created}",
            "validTo": valid_to,
            "recordedAt": recorded_at,
            "expiredAt": None,
        }
        self.facts.append(fact)
        return fact

    def add(self, input):
        moment = self.now()
        same_relation = [fact for fact in self.believed() if fact["subject"] == input["subject"] and fact["predicate"] == input["predicate"]]
        restated = next(
            (
                fact
                for fact in same_relation
                if fact["object"] == input["object"] and fact["validFrom"] <= input["validFrom"] and fact["validTo"] is None
            ),
            None,
        )
        if restated is not None:
            return dict(restated)
        valid_to = None
        if input["predicate"] in self.exclusive:
            later = [fact["validFrom"] for fact in same_relation if fact["validFrom"] > input["validFrom"]]
            valid_to = min(later) if later else None
            for fact in same_relation:
                if fact["validFrom"] == input["validFrom"]:
                    fact["expiredAt"] = moment
                elif fact["validFrom"] < input["validFrom"] and (fact["validTo"] is None or fact["validTo"] > input["validFrom"]):
                    fact["expiredAt"] = moment
                    self.record(fact, input["validFrom"], moment)
        return dict(self.record(input, valid_to, moment))

    def current(self, subject, predicate=None):
        return [
            dict(fact)
            for fact in self.believed()
            if fact["subject"] == subject and (predicate is None or fact["predicate"] == predicate) and fact["validTo"] is None
        ]

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
