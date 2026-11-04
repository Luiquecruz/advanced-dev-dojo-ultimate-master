An order service passes statuses, permissions and alert severities between modules as bare strings and ints, and a typo such as `"payed"` shipped to production last month. Replace them with enums in `main.py`.

## `class Status(StrEnum)`

Members `PENDING`, `PAID`, `SHIPPED` and `CANCELLED`, whose values are their lowercase names (`auto()` does that for a `StrEnum`), in that order.

- Looking up a value must ignore letter case: `Status("Shipped")` and `Status("PAID")` return the members. Implement it in the `_missing_` classmethod, which `Enum` calls when a value is not found; return `None` for anything that is not a known status, so `Enum` raises `ValueError`.
- `Status.parse(text)` is a classmethod that returns the **member itself** (`Status.parse("PAID") is Status.PAID`), not a string, and raises `ValueError` for unknown text or non-string input.

## `class Permission(Flag)`

Single-bit members `READ`, `WRITE` and `DELETE`, plus `ADMIN`, the combination of all three. `Permission.READ | Permission.WRITE` must not contain `DELETE`.

## `describe(flags)`

Return the names of the single-bit members contained in a `Permission` value, sorted alphabetically: `describe(Permission.WRITE | Permission.READ) == ["READ", "WRITE"]`, `describe(Permission.ADMIN) == ["DELETE", "READ", "WRITE"]` (never `"ADMIN"`), and `describe(Permission(0)) == []`.

## `class Severity`

Members `LOW = 1`, `MEDIUM = 2` and `HIGH = 3`. A severity must never be equal to a plain int or to members of other int-valued enums, so `Severity.HIGH == 3` is `False`. Pick the base class that guarantees it.
