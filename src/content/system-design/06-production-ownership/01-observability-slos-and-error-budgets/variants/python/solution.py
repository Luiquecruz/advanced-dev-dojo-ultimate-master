import math


def availability(good, total):
    if total == 0:
        return 1
    return good / total


def error_budget(slo, total, bad):
    allowed_bad = (1 - slo) * total
    remaining = allowed_bad - bad
    if allowed_bad == 0:
        return {"allowed_bad": allowed_bad, "remaining": remaining, "consumed_ratio": 0 if bad == 0 else math.inf}
    return {"allowed_bad": allowed_bad, "remaining": remaining, "consumed_ratio": bad / allowed_bad}


def burn_rate(slo, good, total):
    if total == 0:
        return 0
    error_rate = (total - good) / total
    return error_rate / (1 - slo)


def should_page(slo, long_window, short_window, threshold):
    long_burn = burn_rate(slo=slo, **long_window)
    short_burn = burn_rate(slo=slo, **short_window)
    return long_burn > threshold and short_burn > threshold


if __name__ == "__main__":
    slo = 0.999
    month = error_budget(slo=slo, total=2_000_000, bad=600)
    print(f"budget: {month['allowed_bad']:.0f} bad requests, {month['remaining']:.0f} left, {month['consumed_ratio'] * 100:.1f}% consumed")
    last_hour = {"good": 9_850, "total": 10_000}
    last_five_minutes = {"good": 820, "total": 833}
    print(f"burn rate: {burn_rate(slo=slo, **last_hour):.1f} over 1 hour, {burn_rate(slo=slo, **last_five_minutes):.1f} over 5 minutes")
    print("page:", should_page(slo=slo, long_window=last_hour, short_window=last_five_minutes, threshold=14.4))
