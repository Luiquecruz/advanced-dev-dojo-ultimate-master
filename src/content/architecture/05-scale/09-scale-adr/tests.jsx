const { adr, plan } = mod;

const TEAMS = ['discovery', 'checkout', 'accounts'];
const DOMAINS = ['search', 'booking', 'payments', 'account'];
const TOPOLOGIES = {
  monolith: /monolith/i,
  'modular-monolith': /modular monolith/i,
  monorepo: /monorepo/i,
  'micro-frontends': /micro[- ]?frontends?/i,
};
const TEAM_COUNT = /\b(3|three)\b/i;
const CADENCE = /week|release train/i;

function expectText(value, minimum) {
  expect(typeof value).toBe('string');
  expect(value.trim().length).toBeGreaterThanOrEqual(minimum);
}

test('the ADR is an accepted scale decision with a title, a context and a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('scale');
  expectText(adr.title, 10);
  expectText(adr.context, 80);
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

test('the plan names a known topology that the decision states, and every domain has one owning team', () => {
  expect(Object.keys(TOPOLOGIES)).toContain(plan.topology);
  expect(adr.decision).toMatch(TOPOLOGIES[plan.topology]);
  expect(plan.modules.map((module) => module.name).sort()).toEqual([...DOMAINS].sort());
  plan.modules.forEach((module) => expect(TEAMS).toContain(module.owner));
  const ownerless = TEAMS.filter((team) => !plan.modules.some((module) => module.owner === team));
  expect(ownerless).toEqual([]);
});

test('micro-frontends are rejected or justified with the team count and deploy cadence of the briefing', () => {
  const justification =
    plan.topology === 'micro-frontends'
      ? adr.context
      : adr.alternatives.find((alternative) => TOPOLOGIES['micro-frontends'].test(alternative.option))?.reason;
  expectText(justification, 20);
  expect(justification).toMatch(TEAM_COUNT);
  expect(justification).toMatch(CADENCE);
});

test('the plan lists at least two distinct triggers to revisit the decision', () => {
  expect(Array.isArray(plan.revisitWhen)).toBe(true);
  expect(plan.revisitWhen.length).toBeGreaterThanOrEqual(2);
  plan.revisitWhen.forEach((trigger) => expectText(trigger, 20));
  const triggers = plan.revisitWhen.map((trigger) => trigger.trim().toLowerCase());
  expect(new Set(triggers).size).toBe(triggers.length);
});
