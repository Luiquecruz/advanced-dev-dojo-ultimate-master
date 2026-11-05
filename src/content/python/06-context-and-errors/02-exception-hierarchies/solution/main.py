from collections.abc import Callable
from typing import Any

MIN_AGE = 0
MAX_AGE = 150


class AppError(Exception):
    """Base class of every error the application raises on purpose."""

    status = 500


class ValidationError(AppError, ValueError):
    status = 400


class NotFoundError(AppError, LookupError):
    status = 404


class ConflictError(AppError):
    status = 409


def exit_status(error: BaseException) -> int:
    if isinstance(error, AppError):
        return type(error).status
    return AppError.status


def parse_age(text: str) -> int:
    try:
        age = int(text)
    except ValueError:
        raise ValidationError("age must be a whole number")
    if not MIN_AGE <= age <= MAX_AGE:
        raise ValidationError(f"age must be between {MIN_AGE} and {MAX_AGE}")
    return age


def respond(action: Callable[[], Any]) -> tuple[int, Any]:
    try:
        result = action()
    except AppError as error:
        return exit_status(error), str(error)
    return 200, result
