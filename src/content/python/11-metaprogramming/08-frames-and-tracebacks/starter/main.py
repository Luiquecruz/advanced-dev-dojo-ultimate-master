import inspect
import sys
import traceback


def caller_name(skip: int = 0) -> str:
    """Name of the function that called the function calling `caller_name`, `skip` calls further out."""
    # TODO: start from inspect.currentframe() (this function's own frame) and follow f_back: one step
    # reaches the function that called caller_name, the next reaches *its* caller, then `skip` more.
    # Raise ValueError for a negative skip or when f_back runs out, and `del` the frame in a finally.
    return inspect.stack()[1].function


def call_path(limit: int) -> list[str]:
    """Function names of the `limit` most recent calls that led here, outermost first."""
    # TODO: extract the stack starting at the caller's frame (sys._getframe(1)), not at this function,
    # and keep the `limit` most recent entries in the order a traceback prints them. FrameSummary.name
    # holds each function name.
    return []


def raised_in(error: BaseException) -> str | None:
    """Name of the function where `error` was raised, or None when it was never raised."""
    # TODO: error.__traceback__ starts at the frame that caught the error and tb_next walks toward the
    # frame that raised it. Read the innermost entry (traceback.extract_tb) instead of the first one.
    if error.__traceback__ is None:
        return None
    return error.__traceback__.tb_frame.f_code.co_name


def exception_chain(error: BaseException) -> list[str]:
    """Type names of the exceptions a traceback of `error` prints, root cause first."""
    # TODO: build a traceback.TracebackException and walk it the way a traceback prints: __cause__ when
    # set, otherwise __context__ unless __suppress_context__ is true. Use exc_type_str for each name,
    # stop at a repeated exception, and return the names root cause first.
    return [type(error).__name__]
