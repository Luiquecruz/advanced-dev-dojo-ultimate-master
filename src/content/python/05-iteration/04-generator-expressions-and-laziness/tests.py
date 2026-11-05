class Recorder:
    """A predicate that records every item it is called with."""

    def __init__(self, check):
        self.check = check
        self.seen = []

    def __call__(self, item):
        self.seen.append(item)
        return self.check(item)


def is_even(number):
    return number % 2 == 0


class Amount:
    """A number that writes to a log when sum() adds it."""

    def __init__(self, value, log):
        self.value = value
        self.log = log

    def __radd__(self, other):
        self.log.append(f"add {self.value}")
        return other + self.value


def logged_records(amounts, log):
    for index, amount in enumerate(amounts, start=1):
        log.append(f"read {index}")
        yield {"id": index, "amount": Amount(amount, log)}


def is_small(record):
    return record["amount"].value < 50


# beginner mistake: first_match builds a list comprehension and takes [0], so the predicate runs on every item
@test("first_match returns the first matching item and evaluates nothing after it")
def _():
    predicate = Recorder(is_even)
    found = mod.first_match([3, 8, 5, 10], predicate)
    assert found == 8
    assert predicate.seen == [3, 8]


@test("first_match returns the default only when no item matches, even when the match is falsy")
def _():
    zero = mod.first_match([5, 0, 1], is_even, default=-1)
    missing = mod.first_match([1, 3], is_even, default="none")
    implicit = mod.first_match([], is_even)
    assert zero == 0
    assert missing == "none"
    assert implicit is None


@test("first_match on a shared generator resumes where the previous call stopped")
def _():
    numbers = (number for number in [1, 2, 3, 4, 5])
    first = mod.first_match(numbers, is_even)
    second = mod.first_match(numbers, is_even)
    third = mod.first_match(numbers, is_even, default="exhausted")
    assert first == 2
    assert second == 4
    assert third == "exhausted"


@test("total_valid sums valid amounts, adding each one before the next record is read")
def _():
    log = []
    records = logged_records([10, 99, 5], log)
    total = mod.total_valid(records, is_small)
    again = mod.total_valid(records, is_small)
    plain = mod.total_valid([{"amount": 2.5}, {"amount": 4}], lambda record: True)
    assert total == 15
    assert log == ["read 1", "add 10", "read 2", "read 3", "add 5"]
    assert again == 0
    assert plain == 6.5


@test("count_evaluations reports how many predicate calls any() needed")
def _():
    found = mod.count_evaluations([1, 3, 4, 5, 7], is_even)
    not_found = mod.count_evaluations([1, 3], is_even)
    empty = mod.count_evaluations([], is_even)
    assert found == (True, 3)
    assert not_found == (False, 2)
    assert empty == (False, 0)
