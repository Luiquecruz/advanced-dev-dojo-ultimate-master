import math


def rounded(budget):
    return {key: math.floor(value * 1e9 + 0.5) / 1e9 for key, value in budget.items()}


@test("availability is good / total, and a window without requests counts as fully available")
def _():
    assert mod.availability(good=999_000, total=1_000_000) == approx(0.999, rel=0, abs=1e-9)
    assert mod.availability(good=9_950, total=10_000) == approx(0.995, rel=0, abs=1e-9)
    assert mod.availability(good=0, total=40) == 0
    assert mod.availability(good=0, total=0) == 1


@test("the error budget turns the SLO into allowed bad events, what remains and the share consumed, without rounding")
def _():
    assert rounded(mod.error_budget(slo=0.999, total=1_000_000, bad=250)) == {"allowed_bad": 1_000, "remaining": 750, "consumed_ratio": 0.25}
    assert rounded(mod.error_budget(slo=0.999, total=1_000_000, bad=1_300)) == {"allowed_bad": 1_000, "remaining": -300, "consumed_ratio": 1.3}
    assert rounded(mod.error_budget(slo=0.9995, total=4_000_000, bad=1_500)) == {"allowed_bad": 2_000, "remaining": 500, "consumed_ratio": 0.75}
    assert rounded(mod.error_budget(slo=0.999, total=1_500, bad=1)) == {"allowed_bad": 1.5, "remaining": 0.5, "consumed_ratio": 0.666666667}
    assert mod.error_budget(slo=1, total=1_000_000, bad=1) == {"allowed_bad": 0, "remaining": -1, "consumed_ratio": math.inf}
    assert mod.error_budget(slo=0.99, total=0, bad=0) == {"allowed_bad": 0, "remaining": 0, "consumed_ratio": 0}


@test("the burn rate divides the error rate of the window by the error rate the SLO allows")
def _():
    assert mod.burn_rate(slo=0.999, good=999_000, total=1_000_000) == approx(1, rel=0, abs=1e-9)
    assert mod.burn_rate(slo=0.999, good=9_856, total=10_000) == approx(14.4, rel=0, abs=1e-9)
    assert mod.burn_rate(slo=0.99, good=9_700, total=10_000) == approx(3, rel=0, abs=1e-9)
    assert mod.burn_rate(slo=0.999, good=1_000, total=1_000) == 0
    assert mod.burn_rate(slo=0.999, good=0, total=0) == 0


def page(long_window, short_window):
    return mod.should_page(slo=0.999, long_window=long_window, short_window=short_window, threshold=14.4)


# beginner mistake: paging on a raw error count, or on the short window alone, instead of the budget burn of both windows
@test("paging follows the burn rate of both windows, not the raw number of errors")
def _():
    assert page({"good": 9_850, "total": 10_000}, {"good": 820, "total": 833}) is True
    assert page({"good": 999_850, "total": 1_000_000}, {"good": 83_320, "total": 83_333}) is False
    assert page({"good": 99_467, "total": 100_000}, {"good": 7_800, "total": 8_333}) is False


@test("a burn that already stopped does not page, a sustained one does, and the threshold is respected")
def _():
    incident_hour = {"good": 98_000, "total": 100_000}
    six_hours = {"good": 594_000, "total": 600_000}
    thirty_minutes = {"good": 49_400, "total": 50_000}
    assert mod.should_page(slo=0.999, long_window=incident_hour, short_window={"good": 8_333, "total": 8_333}, threshold=14.4) is False
    assert mod.should_page(slo=0.999, long_window=incident_hour, short_window={"good": 8_100, "total": 8_333}, threshold=14.4) is True
    assert mod.should_page(slo=0.999, long_window=six_hours, short_window=thirty_minutes, threshold=6) is True
    assert mod.should_page(slo=0.999, long_window=six_hours, short_window=thirty_minutes, threshold=14.4) is False
    assert mod.should_page(slo=0.999, long_window={"good": 100_000, "total": 100_000}, short_window={"good": 8_333, "total": 8_333}, threshold=0) is False
