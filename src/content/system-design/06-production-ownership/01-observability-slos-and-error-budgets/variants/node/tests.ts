const round = (value: number) => Math.round(value * 1e9) / 1e9;
const roundAll = (budget: Record<string, number>) => Object.fromEntries(Object.entries(budget).map(([key, value]) => [key, round(value)]));

test('availability is good / total, and a window without requests counts as fully available', () => {
  expect(mod.availability({ good: 999_000, total: 1_000_000 })).toBeCloseTo(0.999, 9);
  expect(mod.availability({ good: 9_950, total: 10_000 })).toBeCloseTo(0.995, 9);
  expect(mod.availability({ good: 0, total: 40 })).toBe(0);
  expect(mod.availability({ good: 0, total: 0 })).toBe(1);
});

test('the error budget turns the SLO into allowed bad events, what remains and the share consumed, without rounding', () => {
  expect(roundAll(mod.errorBudget({ slo: 0.999, total: 1_000_000, bad: 250 }))).toEqual({ allowedBad: 1_000, remaining: 750, consumedRatio: 0.25 });
  expect(roundAll(mod.errorBudget({ slo: 0.999, total: 1_000_000, bad: 1_300 }))).toEqual({ allowedBad: 1_000, remaining: -300, consumedRatio: 1.3 });
  expect(roundAll(mod.errorBudget({ slo: 0.9995, total: 4_000_000, bad: 1_500 }))).toEqual({ allowedBad: 2_000, remaining: 500, consumedRatio: 0.75 });
  expect(roundAll(mod.errorBudget({ slo: 0.999, total: 1_500, bad: 1 }))).toEqual({ allowedBad: 1.5, remaining: 0.5, consumedRatio: 0.666666667 });
  expect(mod.errorBudget({ slo: 1, total: 1_000_000, bad: 1 })).toEqual({ allowedBad: 0, remaining: -1, consumedRatio: Infinity });
  expect(mod.errorBudget({ slo: 0.99, total: 0, bad: 0 })).toEqual({ allowedBad: 0, remaining: 0, consumedRatio: 0 });
});

test('the burn rate divides the error rate of the window by the error rate the SLO allows', () => {
  expect(mod.burnRate({ slo: 0.999, good: 999_000, total: 1_000_000 })).toBeCloseTo(1, 9);
  expect(mod.burnRate({ slo: 0.999, good: 9_856, total: 10_000 })).toBeCloseTo(14.4, 9);
  expect(mod.burnRate({ slo: 0.99, good: 9_700, total: 10_000 })).toBeCloseTo(3, 9);
  expect(mod.burnRate({ slo: 0.999, good: 1_000, total: 1_000 })).toBe(0);
  expect(mod.burnRate({ slo: 0.999, good: 0, total: 0 })).toBe(0);
});

// beginner mistake: paging on a raw error count, or on the short window alone, instead of the budget burn of both windows
test('paging follows the burn rate of both windows, not the raw number of errors', () => {
  const page = (longWindow: { good: number; total: number }, shortWindow: { good: number; total: number }) =>
    mod.shouldPage({ slo: 0.999, longWindow, shortWindow, threshold: 14.4 });
  expect(page({ good: 9_850, total: 10_000 }, { good: 820, total: 833 })).toBe(true);
  expect(page({ good: 999_850, total: 1_000_000 }, { good: 83_320, total: 83_333 })).toBe(false);
  expect(page({ good: 99_467, total: 100_000 }, { good: 7_800, total: 8_333 })).toBe(false);
});

test('a burn that already stopped does not page, a sustained one does, and the threshold is respected', () => {
  const sixHours = { good: 594_000, total: 600_000 };
  const thirtyMinutes = { good: 49_400, total: 50_000 };
  expect(mod.shouldPage({ slo: 0.999, longWindow: { good: 98_000, total: 100_000 }, shortWindow: { good: 8_333, total: 8_333 }, threshold: 14.4 })).toBe(false);
  expect(mod.shouldPage({ slo: 0.999, longWindow: { good: 98_000, total: 100_000 }, shortWindow: { good: 8_100, total: 8_333 }, threshold: 14.4 })).toBe(true);
  expect(mod.shouldPage({ slo: 0.999, longWindow: sixHours, shortWindow: thirtyMinutes, threshold: 6 })).toBe(true);
  expect(mod.shouldPage({ slo: 0.999, longWindow: sixHours, shortWindow: thirtyMinutes, threshold: 14.4 })).toBe(false);
  expect(mod.shouldPage({ slo: 0.999, longWindow: { good: 100_000, total: 100_000 }, shortWindow: { good: 8_333, total: 8_333 }, threshold: 0 })).toBe(false);
});
