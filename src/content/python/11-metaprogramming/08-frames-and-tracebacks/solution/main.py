import inspect
import sys
import traceback


def caller_name(skip: int = 0) -> str:
    """Name of the function that called the function calling `caller_name`, `skip` calls further out."""
    if skip < 0:
        raise ValueError(f"skip must be zero or positive, got {skip}")
    frame = inspect.currentframe()
    try:
        for _ in range(skip + 2):
            if frame is None:
                break
            frame = frame.f_back
        if frame is None:
            raise ValueError(f"the call stack is not deep enough to skip {skip} calls")
        return frame.f_code.co_name
    finally:
        del frame


def call_path(limit: int) -> list[str]:
    """Function names of the `limit` most recent calls that led here, outermost first."""
    frame = sys._getframe(1)
    try:
        entries = traceback.extract_stack(frame, limit=limit)
    finally:
        del frame
    return [entry.name for entry in entries]


def raised_in(error: BaseException) -> str | None:
    """Name of the function where `error` was raised, or None when it was never raised."""
    entries = traceback.extract_tb(error.__traceback__)
    if not entries:
        return None
    return entries[-1].name


def exception_chain(error: BaseException) -> list[str]:
    """Type names of the exceptions a traceback of `error` prints, root cause first."""
    names: list[str] = []
    current = traceback.TracebackException.from_exception(error, lookup_lines=False)
    while current is not None:
        names.append(current.exc_type_str)
        if current.__cause__ is not None:
            current = current.__cause__
        elif current.__suppress_context__:
            current = None
        else:
            current = current.__context__
    names.reverse()
    return names
