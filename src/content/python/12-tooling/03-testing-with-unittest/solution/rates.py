calls: list[str] = []


def fetch_rate(currency: str) -> float:
    """Asks the exchange-rate service how many `currency` units one USD buys.

    The service is not reachable from tests: every real call is recorded and fails.
    """
    calls.append(currency)
    raise ConnectionError(f"exchange-rate service unreachable (asked for {currency})")
