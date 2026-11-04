from enum import Enum, Flag, StrEnum, auto


class Status(StrEnum):
    PENDING = auto()
    PAID = auto()
    SHIPPED = auto()
    CANCELLED = auto()

    @classmethod
    def _missing_(cls, value: object) -> "Status | None":
        if not isinstance(value, str):
            return None
        folded = value.casefold()
        for member in cls:
            if member.value == folded:
                return member
        return None

    @classmethod
    def parse(cls, text: str) -> "Status":
        return cls(text)


class Permission(Flag):
    READ = auto()
    WRITE = auto()
    DELETE = auto()
    ADMIN = READ | WRITE | DELETE


def describe(flags: Permission) -> list[str]:
    return sorted(member.name for member in flags)


class Severity(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
