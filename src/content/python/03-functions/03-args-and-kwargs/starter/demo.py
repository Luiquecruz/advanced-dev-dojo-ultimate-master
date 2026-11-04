from main import compose, forward, retry_call


def price(amount, quantity, *, discount=0):
    return amount * quantity - discount


result, record = forward(price, 10, 3, discount=5)
print("forward:", result, record)

calls = []


def flaky_fetch(resource, *, timeout):
    calls.append(timeout)
    if len(calls) < 3:
        raise ConnectionError(f"attempt {len(calls)} timed out")
    return f"{resource} loaded"


print("retry_call:", retry_call(flaky_fetch, "orders", attempts=4, timeout=2), "after", len(calls), "calls")

slugify = compose(str.strip, str.lower, lambda text: text.replace(" ", "-"))
print("compose:", slugify("  Hello Dojo  "))
