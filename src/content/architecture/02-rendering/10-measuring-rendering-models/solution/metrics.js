export const LONG_TASK_THRESHOLD = 50;

export const METRICS = ['ttfb', 'fcp', 'lcp', 'tbt', 'javascriptBytes'];

function timesOf(events, type) {
  return events.filter((event) => event.type === type).map((event) => event.time);
}

function earliest(times) {
  return times.length === 0 ? null : Math.min(...times);
}

function latest(times) {
  return times.length === 0 ? null : Math.max(...times);
}

export function summarizeTrace({ events }, { tti = Infinity } = {}) {
  const firstInput = earliest(timesOf(events, 'input')) ?? Infinity;
  const ttfb = earliest(timesOf(events, 'response-start'));
  const fcp = earliest(timesOf(events, 'first-contentful-paint'));
  const lcp = latest(timesOf(events, 'largest-contentful-paint').filter((time) => time < firstInput));
  const blockingWindowStart = fcp ?? 0;
  const tbt = events
    .filter((event) => event.type === 'long-task' && event.time >= blockingWindowStart && event.time < tti)
    .reduce((total, task) => total + Math.max(0, task.duration - LONG_TASK_THRESHOLD), 0);
  const javascriptBytes = events.filter((event) => event.type === 'script').reduce((total, script) => total + script.size, 0);

  return { ttfb, fcp, lcp, tbt, javascriptBytes };
}

function compareNullableValues(first, second) {
  return (first === null) - (second === null) || first - second;
}

function fastestModel(rows, metric) {
  const measured = rows.filter((row) => row[metric] !== null);
  if (measured.length === 0) {
    return null;
  }
  return measured.reduce((best, row) => (row[metric] < best[metric] ? row : best)).model;
}

export function compareModels(tracesByModel) {
  const rows = Object.entries(tracesByModel)
    .map(([model, trace]) => ({ model, ...summarizeTrace(trace) }))
    .sort((first, second) => compareNullableValues(first.lcp, second.lcp));
  const fastest = Object.fromEntries(METRICS.map((metric) => [metric, fastestModel(rows, metric)]));

  return { rows, fastest };
}
