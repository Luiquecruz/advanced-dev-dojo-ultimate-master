const { adr, routes } = mod;

const BRIEFING = [
  { path: '/', seo: true, changes: 'deploy', perVisitor: false },
  { path: '/events/:slug', seo: true, changes: 'hourly', perVisitor: false },
  { path: '/events/:slug/checkout', seo: false, changes: 'request', perVisitor: true },
  { path: '/account/tickets', seo: false, changes: 'request', perVisitor: true },
  { path: '/help/:article', seo: true, changes: 'deploy', perVisitor: false },
];

const MODELS = ['static', 'ssg', 'isr', 'ssr', 'spa'];

function expectText(value, minimum) {
  expect(typeof value).toBe('string');
  expect(value.trim().length).toBeGreaterThanOrEqual(minimum);
}

function violations(predicate, forbidden) {
  return BRIEFING.filter(predicate)
    .map((entry) => ({ path: entry.path, model: routes.find((route) => route.path === entry.path)?.model }))
    .filter((entry) => forbidden.includes(entry.model));
}

test('the ADR is an accepted rendering decision with a title, a context about SEO and freshness and a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('rendering');
  expectText(adr.title, 10);
  expectText(adr.context, 80);
  expect(adr.context).toMatch(/seo/i);
  expect(adr.context).toMatch(/fresh|stale|chang/i);
  expectText(adr.decision, 40);
  expect(adr.decision.trim()).toMatch(/^we will\b/i);
});

test('lists at least two distinct alternatives, each with the reason it was rejected', () => {
  expect(Array.isArray(adr.alternatives)).toBe(true);
  expect(adr.alternatives.length).toBeGreaterThanOrEqual(2);
  adr.alternatives.forEach((alternative) => {
    expectText(alternative.option, 3);
    expectText(alternative.reason, 20);
  });
  const options = adr.alternatives.map((alternative) => alternative.option.trim().toLowerCase());
  expect(new Set(options).size).toBe(options.length);
});

test('consequences list at least one positive and one negative item', () => {
  ['positive', 'negative'].forEach((side) => {
    expect(Array.isArray(adr.consequences[side])).toBe(true);
    expect(adr.consequences[side].length).toBeGreaterThanOrEqual(1);
    adr.consequences[side].forEach((item) => expectText(item, 15));
  });
});

test('routes maps every briefing path exactly once to a known model with a reason', () => {
  expect(routes.map((route) => route.path).sort()).toEqual(BRIEFING.map((entry) => entry.path).sort());
  routes.forEach((route) => {
    expect(MODELS).toContain(route.model);
    expectText(route.reason, 15);
  });
});

test('SEO-critical routes are not a SPA and per-visitor routes are not served from shared prebuilt HTML', () => {
  expect(violations((entry) => entry.seo, ['spa'])).toEqual([]);
  expect(violations((entry) => entry.perVisitor || entry.changes === 'request', ['static', 'ssg', 'isr'])).toEqual([]);
});

test('data that changes during the day is not frozen at build time and deploy-only content is not rendered per request', () => {
  expect(violations((entry) => entry.changes === 'hourly', ['static', 'ssg'])).toEqual([]);
  expect(violations((entry) => entry.changes === 'deploy', ['ssr'])).toEqual([]);
});
