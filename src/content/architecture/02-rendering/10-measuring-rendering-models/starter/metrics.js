export const LONG_TASK_THRESHOLD = 50;

export const METRICS = ['ttfb', 'fcp', 'lcp', 'tbt', 'javascriptBytes'];

function timesOf(events, type) {
  return events.filter((event) => event.type === type).map((event) => event.time);
}

export function summarizeTrace({ events }, { tti = Infinity } = {}) {
  const ttfb = Math.min(...timesOf(events, 'response-start'));
  // TODO: fcp = earliest 'first-contentful-paint' (null when there is none)
  const fcp = null;
  // TODO: lcp = latest 'largest-contentful-paint' candidate before the first 'input' (null when there is none)
  const lcp = null;
  // TODO: tbt = sum of (duration - 50) for long tasks starting at or after FCP and before tti
  const tbt = 0;
  // TODO: javascriptBytes = sum of the size of every 'script' event
  const javascriptBytes = 0;

  return { ttfb, fcp, lcp, tbt, javascriptBytes };
}

export function compareModels(tracesByModel) {
  // TODO: one row { model, ...summarizeTrace(trace) } per model, sorted by LCP (null last)
  const rows = [];
  // TODO: fastest[metric] = model with the lowest non-null value (first row wins a tie)
  const fastest = {};

  return { rows, fastest };
}
