const { traces } = modules['traces.js'];

const productPage = {
  events: [
    { type: 'largest-contentful-paint', time: 1400, element: 'img.hero' },
    { type: 'script', time: 300, size: 120000 },
    { type: 'response-start', time: 200 },
    { type: 'first-contentful-paint', time: 600 },
    { type: 'largest-contentful-paint', time: 600, element: 'h1' },
    { type: 'script', time: 300, size: 30000 },
  ],
};

test('summarizeTrace reads TTFB, FCP, the last LCP candidate and the JavaScript bytes, whatever the event order', () => {
  expect(mod.summarizeTrace(productPage)).toEqual({ ttfb: 200, fcp: 600, lcp: 1400, tbt: 0, javascriptBytes: 150000 });
});

test('TBT sums the time over 50 ms of each long task between FCP and the end of the trace or tti', () => {
  const trace = {
    events: [
      { type: 'response-start', time: 100 },
      { type: 'long-task', time: 300, duration: 400 },
      { type: 'first-contentful-paint', time: 800 },
      { type: 'long-task', time: 900, duration: 120 },
      { type: 'long-task', time: 1200, duration: 50 },
      { type: 'long-task', time: 1500, duration: 250 },
      { type: 'long-task', time: 2600, duration: 300 },
    ],
  };
  expect(mod.summarizeTrace(trace).tbt).toBe(70 + 0 + 200 + 250);
  expect(mod.summarizeTrace(trace, { tti: 2000 }).tbt).toBe(70 + 0 + 200);
});

test('LCP ignores candidates reported after the first input, and missing metrics are null', () => {
  const trace = {
    events: [
      ...productPage.events,
      { type: 'input', time: 1000 },
      { type: 'largest-contentful-paint', time: 2200, element: 'img.carousel' },
    ],
  };
  expect(mod.summarizeTrace(trace).lcp).toBe(600);
  expect(mod.summarizeTrace({ events: [{ type: 'response-start', time: 90 }] })).toEqual({ ttfb: 90, fcp: null, lcp: null, tbt: 0, javascriptBytes: 0 });
});

test('the sample traces show each model trade-off', () => {
  expect(mod.summarizeTrace(traces.SPA)).toEqual({ ttfb: 70, fcp: 1240, lcp: 2420, tbt: 100, javascriptBytes: 412000 });
  expect(mod.summarizeTrace(traces.SSR)).toEqual({ ttfb: 480, fcp: 780, lcp: 1180, tbt: 300, javascriptBytes: 186000 });
  expect(mod.summarizeTrace(traces.SSG)).toEqual({ ttfb: 90, fcp: 390, lcp: 860, tbt: 300, javascriptBytes: 186000 });
  expect(mod.summarizeTrace(traces.Islands)).toEqual({ ttfb: 90, fcp: 380, lcp: 850, tbt: 25, javascriptBytes: 52000 });
});

test('compareModels returns rows sorted by LCP and the fastest model for each metric', () => {
  const comparison = mod.compareModels(traces);
  expect(comparison.rows.map((row) => row.model)).toEqual(['Islands', 'SSG', 'SSR', 'SPA']);
  expect(comparison.rows[3]).toEqual({ model: 'SPA', ttfb: 70, fcp: 1240, lcp: 2420, tbt: 100, javascriptBytes: 412000 });
  expect(comparison.fastest).toEqual({ ttfb: 'SPA', fcp: 'Islands', lcp: 'Islands', tbt: 'Islands', javascriptBytes: 'Islands' });
});

test('compareModels puts models without LCP last, skips null values and lets the first row win a tie', () => {
  const comparison = mod.compareModels({
    Broken: { events: [{ type: 'response-start', time: 50 }] },
    Slow: { events: [{ type: 'response-start', time: 300 }, { type: 'first-contentful-paint', time: 900 }, { type: 'largest-contentful-paint', time: 900 }] },
    Fast: { events: [{ type: 'response-start', time: 300 }, { type: 'first-contentful-paint', time: 500 }, { type: 'largest-contentful-paint', time: 700 }] },
  });
  expect(comparison.rows.map((row) => row.model)).toEqual(['Fast', 'Slow', 'Broken']);
  expect(comparison.fastest).toEqual({ ttfb: 'Broken', fcp: 'Fast', lcp: 'Fast', tbt: 'Fast', javascriptBytes: 'Fast' });
});
