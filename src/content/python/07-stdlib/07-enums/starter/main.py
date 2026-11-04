from enum import Enum, Flag, IntEnum, StrEnum, auto


class Status(StrEnum):
    PENDING = auto()
    PAID = auto()
    SHIPPED = auto()
    CANCELLED = auto()

    # TODO: add a _missing_ classmethod that finds a member whatever the letter case of the value,
    # and returns None for anything else.

    @classmethod
    def parse(cls, text: str) -> "Status":
        # TODO: return the member itself (and let unknown text raise ValueError), not a string.
        return text.lower()


class Permission(Flag):
    # TODO: each permission must be a single bit (auto()), and ADMIN all three combined.
    READ = 1
    WRITE = 2
    DELETE = 3
    ADMIN = READ | WRITE


def describe(flags: Permission) -> list[str]:
    # TODO: iterate over the flag value to get its single-bit members, and sort their names.
    return [flags.name]


# TODO: an IntEnum compares equal to plain ints. Choose a base class whose members do not.
class Severity(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
