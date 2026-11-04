import inspect

from main import ORDER, count_calls, job, require_positive


@count_calls
@require_positive
def resize(width: int, height: int = 100, *, keep_ratio: bool = True) -> str:
    """Resize an image."""
    return f"{width}x{height} keep_ratio={keep_ratio}"


print(resize(640, 480))
try:
    resize(0)
except ValueError as error:
    print("rejected:", error)
print("calls:", resize.calls, "| name:", resize.__name__, "| doc:", resize.__doc__)
print("signature:", inspect.signature(resize))

print(job("backup"), "| order:", ORDER)
