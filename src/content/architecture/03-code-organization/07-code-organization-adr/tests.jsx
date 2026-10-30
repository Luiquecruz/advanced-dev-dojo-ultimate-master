const { adr, structure } = mod;

const BRIEFING = [
  { name: 'appointments', usedBy: [] },
  { name: 'invoices', usedBy: [] },
  { name: 'pet', usedBy: ['appointments', 'invoices'] },
  { name: 'ui', usedBy: ['appointments', 'invoices', 'pet'] },
];

function expectText(value, minimum) {
  expect(typeof value).toBe('string');
  expect(value.trim().length).toBeGreaterThanOrEqual(minimum);
}

function depth(layer) {
  return structure.layers.indexOf(layer);
}

function sliceNamed(name) {
  return structure.slices.find((slice) => slice.name === name);
}

test('the ADR is an accepted code organization decision whose "We will" sentence names the public API', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('code-organization');
  expectText(adr.title, 10);
  expectText(adr.context, 80);
  expectText(adr.decision, 40);
  expect(adr.decision.trim()).toMatch(/^we will\b/i);
  expect(adr.decision).toMatch(/public api/i);
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

test('layers run from app to shared and every layer may import only layers below it, always including shared', () => {
  const { layers, allowedImports } = structure;
  expect(layers.length).toBeGreaterThanOrEqual(3);
  expect(new Set(layers).size).toBe(layers.length);
  expect(layers[0]).toBe('app');
  expect(layers[layers.length - 1]).toBe('shared');
  expect(Object.keys(allowedImports).sort()).toEqual([...layers].sort());
  const upward = layers.flatMap((layer) =>
    allowedImports[layer].filter((target) => depth(target) <= depth(layer)).map((target) => `${layer} -> ${target}`),
  );
  expect(upward).toEqual([]);
  layers.slice(0, -1).forEach((layer) => expect(allowedImports[layer]).toContain('shared'));
  expect(allowedImports.shared).toEqual([]);
});

test('every briefing slice is placed once in a layer below app and exposes src/<layer>/<name>/index as its public API', () => {
  expect(structure.slices.map((slice) => slice.name).sort()).toEqual(BRIEFING.map((entry) => entry.name).sort());
  structure.slices.forEach((slice) => {
    expect(structure.layers).toContain(slice.layer);
    expect(slice.layer).not.toBe('app');
    expect(slice.publicApi).toMatch(new RegExp(`^src/${slice.layer}/${slice.name}/index\\.(js|jsx|ts|tsx)$`));
  });
});

test('a slice sits strictly below every slice that uses it', () => {
  const misplaced = BRIEFING.flatMap((entry) =>
    entry.usedBy
      .filter((consumer) => depth(sliceNamed(entry.name)?.layer) <= depth(sliceNamed(consumer)?.layer))
      .map((consumer) => `${entry.name} is not below ${consumer}`),
  );
  expect(misplaced).toEqual([]);
});
