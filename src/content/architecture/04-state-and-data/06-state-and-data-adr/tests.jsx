const { adr, stateMap } = mod;

const BRIEFING = [
  { state: 'products', fact: 'server' },
  { state: 'currentUser', fact: 'server' },
  { state: 'aisle', fact: 'shareable' },
  { state: 'page', fact: 'shareable' },
  { state: 'cart', fact: 'distant' },
  { state: 'cartTotal', fact: 'derived' },
  { state: 'addressDraft', fact: 'draft' },
  { state: 'isFilterPanelOpen', fact: 'ui' },
  { state: 'checkoutStep', fact: 'flow' },
];

const HOMES = ['server-cache', 'url', 'form', 'local', 'client-store', 'state-machine', 'derived'];

function expectText(value, minimum) {
  expect(typeof value).toBe('string');
  expect(value.trim().length).toBeGreaterThanOrEqual(minimum);
}

function misplaced(fact, allowed) {
  return BRIEFING.filter((entry) => entry.fact === fact)
    .map((entry) => ({ state: entry.state, home: stateMap.find((row) => row.state === entry.state)?.home }))
    .filter((entry) => !allowed.includes(entry.home));
}

test('the ADR is an accepted state and data decision with a context about server and client state and a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('state-and-data');
  expectText(adr.title, 10);
  expectText(adr.context, 80);
  expect(adr.context).toMatch(/server/i);
  expect(adr.context).toMatch(/client/i);
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

test('the state map gives every briefing piece exactly one allowed home with a reason', () => {
  expect(stateMap.map((row) => row.state).sort()).toEqual(BRIEFING.map((entry) => entry.state).sort());
  stateMap.forEach((row) => {
    expect(HOMES).toContain(row.home);
    expectText(row.reason, 15);
  });
});

test('server data lives in the server cache, shareable state in the URL and computed values are derived', () => {
  expect(misplaced('server', ['server-cache'])).toEqual([]);
  expect(misplaced('shareable', ['url'])).toEqual([]);
  expect(misplaced('derived', ['derived'])).toEqual([]);
});

test('the client store holds only client state read on different routes, checkout is a machine and the draft is a form', () => {
  const inStore = stateMap.filter((row) => row.home === 'client-store').map((row) => row.state);
  expect(inStore).toEqual(BRIEFING.filter((entry) => entry.fact === 'distant').map((entry) => entry.state));
  expect(misplaced('flow', ['state-machine'])).toEqual([]);
  expect(misplaced('draft', ['form', 'local'])).toEqual([]);
});
