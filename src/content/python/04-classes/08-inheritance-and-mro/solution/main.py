class Entity:
    """Base of every persisted object. It ends the save chain."""

    def save(self, log: list[str]) -> list[str]:
        log.append("Entity")
        return log


class ValidationMixin(Entity):
    def save(self, log: list[str]) -> list[str]:
        log.append("Validation")
        return super().save(log)


class AuditMixin(Entity):
    def save(self, log: list[str]) -> list[str]:
        log.append("Audit")
        return super().save(log)


class TimestampMixin(Entity):
    def save(self, log: list[str]) -> list[str]:
        log.append("Timestamp")
        return super().save(log)


class Order(ValidationMixin, AuditMixin, TimestampMixin):
    """Validation first, then audit, then timestamps, then the base."""


def linearize(cls: type) -> list[str]:
    return [klass.__name__ for klass in cls.__mro__]
