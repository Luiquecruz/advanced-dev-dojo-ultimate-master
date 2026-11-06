import math


def availability(good, total):
    # TODO: a window without requests (total 0) had no failure: return 1
    return good / total


def error_budget(slo, total, bad):
    # TODO: allowed_bad = (1 - slo) * total, not rounded, and remaining = allowed_bad - bad
    # TODO: consumed_ratio = bad / allowed_bad; when allowed_bad is 0: 0 without bad events, math.inf with any
    return {"allowed_bad": 0, "remaining": 0, "consumed_ratio": 0}


def burn_rate(slo, good, total):
    # TODO: divide the error rate of the window by the error rate the SLO allows (1 - slo); an empty window burns 0
    return total - good


def should_page(slo, long_window, short_window, threshold):
    # TODO: page only when the burn rate of both windows is greater than threshold
    return burn_rate(slo=slo, **short_window) > threshold


if __name__ == "__main__":
    slo = 0.999
    month = error_budget(slo=slo, total=2_000_000, bad=600)
    print(f"budget: {month['allowed_bad']:.0f} bad requests, {month['remaining']:.0f} left, {month['consumed_ratio'] * 100:.1f}% consumed")
    last_hour = {"good": 9_850, "total": 10_000}
    last_five_minutes = {"good": 820, "total": 833}
    print(f"burn rate: {burn_rate(slo=slo, **last_hour):.1f} over 1 hour, {burn_rate(slo=slo, **last_five_minutes):.1f} over 5 minutes")
    print("page:", should_page(slo=slo, long_window=last_hour, short_window=last_five_minutes, threshold=14.4))
