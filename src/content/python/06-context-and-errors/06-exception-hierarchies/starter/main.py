from collections.abc import Callable
from typing import Any

MIN_AGE = 0
MAX_AGE = 150


class AppError(Exception):
    """Base class of every error the application raises on purpose."""

    status = 500


# TODO: each domain error derives from AppError. ValidationError is also a ValueError and
# NotFoundError is also a LookupError, so existing handlers for those families keep working.
class ValidationError(Exception):
    status = 400


class NotFoundError(Exception):
    status = 404


class ConflictError(Exception):
    status = 409


def exit_status(error: BaseException) -> int:
    # TODO: return the status of the nearest class in the error's hierarchy that defines one,
    # and AppError.status for exceptions that are not AppErrors.
    return AppError.status


def parse_age(text: str) -> int:
    # TODO: raise ValidationError (with "age" in the message) when the text is not a whole number
    # or the age is outside MIN_AGE..MAX_AGE.
    return int(text)


def respond(action: Callable[[], Any]) -> tuple[int, Any]:
    # TODO: return (200, result) on success and (status, message) for AppErrors only.
    # Every other exception is a bug and must propagate.
    try:
        return 200, action()
    except Exception as error:
        return exit_status(error), str(error)
