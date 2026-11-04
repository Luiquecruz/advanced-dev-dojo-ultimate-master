class Entity:
    """Base of every persisted object. It ends the save chain."""

    def save(self, log: list[str]) -> list[str]:
        log.append("Entity")
        return log


class ValidationMixin(Entity):
    def save(self, log: list[str]) -> list[str]:
        log.append("Validation")
        # TODO: hand over to the next class in the MRO instead of calling Entity directly.
        return Entity.save(self, log)


class AuditMixin(Entity):
    def save(self, log: list[str]) -> list[str]:
        log.append("Audit")
        # TODO: same fix as ValidationMixin.
        return Entity.save(self, log)


class TimestampMixin(Entity):
    def save(self, log: list[str]) -> list[str]:
        log.append("Timestamp")
        # TODO: same fix as ValidationMixin.
        return Entity.save(self, log)


# TODO: compose Order so that save runs Validation, then Audit, then Timestamp, then Entity.
class Order(TimestampMixin, ValidationMixin):
    """Validation first, then audit, then timestamps, then the base."""


def linearize(cls: type) -> list[str]:
    # TODO: the names of the classes in the method resolution order, from cls to object.
    return [cls.__name__]
