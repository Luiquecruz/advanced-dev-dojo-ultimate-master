from enum import IntEnum


def raised(action):
    """Returns the name of the exception `action` raises, or "nothing"."""
    try:
        action()
    except Exception as error:
        return type(error).__name__
    return "nothing"


@test("Status values are lowercase names and lookups ignore case, returning the member itself")
def _():
    Status = mod.Status
    values = [member.value for member in Status]
    assert values == ["pending", "paid", "shipped", "cancelled"]
    assert Status.PAID == "paid"
    assert str(Status.SHIPPED) == "shipped"
    parsed = Status.parse("PAID")
    assert parsed is Status.PAID
    looked_up = Status("Shipped")
    assert looked_up is Status.SHIPPED


@test("Status.parse rejects unknown text and non-string input with ValueError")
def _():
    outcomes = [raised(lambda: mod.Status.parse(value)) for value in ("refunded", "payed", "", 1, None)]
    assert outcomes == ["ValueError"] * 5


@test("Permission members combine with | and are tested with in")
def _():
    Permission = mod.Permission
    read_write = Permission.READ | Permission.WRITE
    assert Permission.READ in read_write
    assert Permission.DELETE not in read_write
    assert read_write in Permission.ADMIN
    assert Permission.ADMIN == Permission.READ | Permission.WRITE | Permission.DELETE
    assert bool(Permission(0)) is False


@test("describe lists the single-bit member names of a flag value in sorted order")
def _():
    Permission = mod.Permission
    cases = {
        "write|read": mod.describe(Permission.WRITE | Permission.READ),
        "admin": mod.describe(Permission.ADMIN),
        "delete": mod.describe(Permission.DELETE),
        "none": mod.describe(Permission(0)),
    }
    assert cases == {"write|read": ["READ", "WRITE"], "admin": ["DELETE", "READ", "WRITE"], "delete": ["DELETE"], "none": []}


@test("Severity members are singletons that never equal plain ints")
def _():
    Severity = mod.Severity

    class Retries(IntEnum):
        ONCE = 1
        THRICE = 3

    assert Retries.THRICE == 3
    assert Severity.HIGH != 3
    assert Severity.HIGH != Retries.THRICE
    assert Severity(3) is Severity.HIGH
    assert Severity["LOW"] is Severity.LOW
    assert not isinstance(Severity.LOW, int)
