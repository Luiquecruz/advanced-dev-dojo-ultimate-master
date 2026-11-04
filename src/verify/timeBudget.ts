/**
 * Time budgets of lesson verification. The engines keep the learner's limits (4 s per JavaScript test, 1.5 s loop guard,
 * 2 s TypeScript runtime test, 6 s per Python test); verification multiplies them so a machine busy with parallel runs
 * does not fail a correct solution, while a real hang still fails, only later.
 */
const DEFAULT_SCALE = 3;

function readScale(): number {
  const value = Number(process.env.DOJO_VERIFY_TIME_SCALE);
  return Number.isFinite(value) && value >= 1 ? value : DEFAULT_SCALE;
}

export const VERIFY_TIME_SCALE = readScale();

export function scaledBudget(milliseconds: number): number {
  return Math.round(milliseconds * VERIFY_TIME_SCALE);
}

const TIMEOUT_FAILURE = /timed out after \d+ ?ms|did not finish within \d+ms|Potential infinite loop detected/;

/**
 * True when a report failed only because of time budgets: every failing test hit a timeout or the loop guard.
 */
export function failedOnlyByTime(results: Array<{ passed: boolean; error?: string }>, compileError?: string): boolean {
  const failures = results.filter((result) => !result.passed);
  return compileError === undefined && failures.length > 0 && failures.every((result) => TIMEOUT_FAILURE.test(result.error ?? ''));
}

/**
 * Runs a grading step and repeats it once when it failed only by time, so load spikes do not fail verification but a
 * consistent hang does.
 */
export async function retryTimeoutsOnce<T extends { results: Array<{ passed: boolean; error?: string }>; compileError?: string }>(
  label: string,
  grade: () => Promise<T>,
): Promise<T> {
  const first = await grade();
  if (!failedOnlyByTime(first.results, first.compileError)) {
    return first;
  }
  console.warn(`[verify] ${label}: only timeouts failed, retrying once (time scale ${VERIFY_TIME_SCALE}).`);
  return grade();
}
