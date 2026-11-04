// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { installLoopGuard } from '../engines/shared/compile';
import { failedOnlyByTime, retryTimeoutsOnce, scaledBudget, VERIFY_TIME_SCALE } from './timeBudget';

const timedOut = { passed: false, error: 'Test "a" timed out after 12000ms.' };
const loopGuard = { passed: false, error: 'RangeError: Potential infinite loop detected: a loop ran for more than 4500ms.' };
const pythonStopped = { passed: false, error: 'Test "b" did not finish within 18000ms and was stopped.' };
const wrong = { passed: false, error: 'expected 1 to be 2' };
const passed = { passed: true };

describe('verification time budget', () => {
  it('scales engine limits by at least 1', () => {
    expect(VERIFY_TIME_SCALE).toBeGreaterThanOrEqual(1);
    expect(scaledBudget(4000)).toBe(Math.round(4000 * VERIFY_TIME_SCALE));
  });

  it('treats only timeouts and the loop guard as time failures', () => {
    expect(failedOnlyByTime([passed, timedOut, loopGuard, pythonStopped])).toBe(true);
    expect(failedOnlyByTime([timedOut, wrong])).toBe(false);
    expect(failedOnlyByTime([passed])).toBe(false);
    expect(failedOnlyByTime([timedOut], 'SyntaxError')).toBe(false);
  });

  it('retries a timeout-only failure once and keeps a consistent hang failing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const flaky = vi.fn().mockResolvedValueOnce({ results: [timedOut] }).mockResolvedValueOnce({ results: [passed] });
    expect((await retryTimeoutsOnce('flaky', flaky)).results).toEqual([passed]);
    const hang = vi.fn().mockResolvedValue({ results: [timedOut] });
    expect((await retryTimeoutsOnce('hang', hang)).results).toEqual([timedOut]);
    expect(hang).toHaveBeenCalledTimes(2);
    const broken = vi.fn().mockResolvedValue({ results: [wrong] });
    await retryTimeoutsOnce('broken', broken);
    expect(broken).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('keeps stopping infinite loops with a raised loop guard limit', () => {
    const target = {} as typeof globalThis;
    installLoopGuard(target, 50);
    const guard = (target as unknown as { __dojoLoopGuard: () => void }).__dojoLoopGuard;
    expect(() => {
      for (;;) {
        guard();
      }
    }).toThrow('more than 50ms');
  });
});
