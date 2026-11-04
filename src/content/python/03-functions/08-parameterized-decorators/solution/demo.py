from main import RateLimitError, rate_limit, retry


class ManualClock:
    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


clock = ManualClock()


@rate_limit(2, 60, clock)
def notify(user):
    return f"notified {user}"


for second, user in [(0, "ada"), (10, "linus"), (20, "grace"), (61, "grace")]:
    clock.now = second
    try:
        print(f"t={second:>2}s", notify(user))
    except RateLimitError as error:
        print(f"t={second:>2}s rejected:", error)

attempts = []


@retry(times=4, exceptions=(ConnectionError,))
def fetch_report():
    attempts.append(len(attempts) + 1)
    if len(attempts) < 3:
        raise ConnectionError("gateway timeout")
    return "report ready"


print(fetch_report(), "after attempts", attempts, "| name:", fetch_report.__name__)


@retry
def ping():
    return "pong"


print("bare @retry:", ping())
