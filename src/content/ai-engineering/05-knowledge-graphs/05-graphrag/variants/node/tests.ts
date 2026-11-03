const { createModel } = require('@dojo/ai');

function entity(id: string, type = 'Thing') {
  return { id, name: id.replace(/-/g, ' '), type, description: `About ${id}.` };
}

function graphOf(ids: string[], pairs: Array<[string, string]>) {
  return { entities: ids.map((id) => entity(id)), relations: pairs.map(([source, target]) => ({ source, target, type: 'LINKED' })) };
}

function clique(ids: string[]): Array<[string, string]> {
  return ids.flatMap((left, index) => ids.slice(index + 1).map((right) => [left, right] as [string, string]));
}

function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

const membersOf = (communities: Array<{ members: string[] }>) => communities.map((community) => community.members);

function supplyGraph() {
  return {
    entities: [
      { id: 'acme', name: 'Acme', type: 'Supplier', description: 'Metal parts supplier in Germany.' },
      { id: 'bolt', name: 'Bolt M4', type: 'Part', description: 'Steel bolt.' },
      { id: 'kettle', name: 'Kettle', type: 'Product', description: 'Electric kettle.' },
      { id: 'reach', name: 'REACH', type: 'Regulation', description: 'EU chemicals regulation.' },
      { id: 'globex', name: 'Globex', type: 'Supplier', description: 'Plastics supplier.' },
      { id: 'lid', name: 'Lid', type: 'Part', description: 'Plastic lid.' },
    ],
    relations: [
      { source: 'acme', target: 'bolt', type: 'SUPPLIES' },
      { source: 'bolt', target: 'kettle', type: 'USED_IN' },
      { source: 'kettle', target: 'reach', type: 'SUBJECT_TO' },
      { source: 'globex', target: 'lid', type: 'SUPPLIES' },
    ],
  };
}

function reports(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    communityId: `community-${index + 1}`,
    title: `Report title ${index + 1}`,
    summary: `Summary of community ${index + 1}.`,
    members: [],
    fallback: false,
  }));
}

test('detectCommunities splits two dense groups joined by a single bridge, and keeps isolated entities apart', () => {
  const left = ['a1', 'a2', 'a3', 'a4'];
  const right = ['b1', 'b2', 'b3', 'b4'];
  for (const bridge of [['a4', 'b1'], ['a1', 'b4'], ['a2', 'b3']] as Array<[string, string]>) {
    const graph = graphOf([...left, ...right, 'loner'], [...clique(left), ...clique(right), bridge]);
    const communities = mod.detectCommunities(graph);
    expect(membersOf(communities)).toEqual([left, right, ['loner']]);
    expect(communities.map((community: { id: string }) => community.id)).toEqual(['community-1', 'community-2', 'community-3']);
  }
});

test('detectCommunities finds three groups in a chain, ordered by size, and the result does not depend on input order', async () => {
  const groups = [['c1', 'c2', 'c3'], ['d1', 'd2', 'd3', 'd4', 'd5'], ['e1', 'e2', 'e3', 'e4']];
  const pairs = [...groups.flatMap(clique), ['c3', 'd1'], ['d5', 'e1']] as Array<[string, string]>;
  const ids = groups.flat();
  const expected = [groups[1], groups[2], groups[0]];
  expect(membersOf(mod.detectCommunities(graphOf(ids, pairs)))).toEqual(expected);
  await forEachSeed(10, (seed: number) => {
    const random = createRandom(seed);
    const shuffled = graphOf(shuffle(ids, random), shuffle(pairs, random).map(([source, target]) => (random() < 0.5 ? [source, target] : [target, source]) as [string, string]));
    expect(membersOf(mod.detectCommunities(shuffled))).toEqual(expected);
  });
});

test('detectCommunities puts every entity in exactly one community and never joins disconnected entities', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const random = createRandom(seed);
    const ids = Array.from({ length: 14 }, (_, index) => `n${String(index).padStart(2, '0')}`);
    const pairs: Array<[string, string]> = [];
    for (let count = 0; count < 16; count++) {
      pairs.push([ids[Math.floor(random() * ids.length)], ids[Math.floor(random() * ids.length)]]);
    }
    const communities = mod.detectCommunities(graphOf(ids, pairs));
    expect(communities.flatMap((community: { members: string[] }) => community.members).sort()).toEqual(ids);
    const component = new Map(ids.map((id) => [id, id]));
    const find = (id: string): string => (component.get(id) === id ? id : find(component.get(id)!));
    pairs.forEach(([left, right]) => component.set(find(left), find(right)));
    communities.forEach((community: { members: string[] }) => {
      expect(new Set(community.members.map(find)).size).toBe(1);
    });
  }
});

test('summarizeCommunities sends each community only its own entities and relations and survives malformed JSON', async () => {
  const graph = supplyGraph();
  const communities = [
    { id: 'community-1', members: ['acme', 'bolt', 'kettle', 'reach'] },
    { id: 'community-2', members: ['globex', 'lid'] },
  ];
  await forEachSeed(16, async () => {
    const kettleReport = { title: 'Kettle supply chain', summary: 'Acme bolts go into kettles under REACH.' };
    let kettleCalls = 0;
    fakeModel.handle((request: { messages: Array<{ content: string }> }) => {
      if (!request.messages.some((message) => message.content.includes('Acme'))) {
        return respond.json({ title: 'Plastics', summary: 'Globex supplies lids.' });
      }
      kettleCalls += 1;
      return kettleCalls === 1 ? respond.malformedJson(kettleReport) : respond.json(kettleReport);
    });
    const result = await mod.summarizeCommunities(createModel(), graph, communities);
    expect(result).toEqual([
      { communityId: 'community-1', title: 'Kettle supply chain', summary: 'Acme bolts go into kettles under REACH.', members: communities[0].members, fallback: false },
      { communityId: 'community-2', title: 'Plastics', summary: 'Globex supplies lids.', members: communities[1].members, fallback: false },
    ]);
    const prompts = fakeModel.requests.map((request: { messages: Array<{ content: string }> }) => request.messages.map((message) => message.content).join('\n'));
    const first = prompts[0];
    const last = prompts[prompts.length - 1];
    ['Acme', 'Bolt M4', 'Kettle', 'REACH', 'SUPPLIES', 'USED_IN', 'SUBJECT_TO'].forEach((text) => expect(first).toContain(text));
    ['Globex', 'Lid'].forEach((text) => expect(first).not.toContain(text));
    ['Globex', 'Lid', 'SUPPLIES'].forEach((text) => expect(last).toContain(text));
    ['Acme', 'Kettle', 'USED_IN'].forEach((text) => expect(last).not.toContain(text));
    expect(fakeModel.requests.length).toBeLessThanOrEqual(3);
  });
});

test('summarizeCommunities falls back to a report built from the graph after two unusable replies or a refusal', async () => {
  const graph = supplyGraph();
  const communities = [
    { id: 'community-1', members: ['acme', 'bolt', 'kettle', 'reach'] },
    { id: 'community-2', members: ['globex', 'lid'] },
  ];
  fakeModel.reply(respond.text('A supply chain.'), respond.json({ title: '', summary: 'x' }), respond.refusal());
  const [first, second] = await mod.summarizeCommunities(createModel(), graph, communities);
  expect(fakeModel.requests).toHaveLength(3);
  expect(first.fallback).toBe(true);
  expect(first.communityId).toBe('community-1');
  expect(first.title).toBe('Bolt M4, Kettle, Acme');
  ['Acme', 'Bolt M4', 'Kettle', 'REACH'].forEach((name) => expect(first.summary).toContain(name));
  expect(second.fallback).toBe(true);
  expect(second.title).toBe('Globex, Lid');
});

test('routeQuestion sends questions naming an entity to local search and the rest to global search', () => {
  const graph = supplyGraph();
  expect(mod.routeQuestion('Which products use parts from Acme?', graph)).toEqual({ mode: 'local', entityIds: ['acme'] });
  expect(mod.routeQuestion('Is the kettle subject to reach?', graph)).toEqual({ mode: 'local', entityIds: ['kettle', 'reach'] });
  expect(mod.routeQuestion('What does bolt m4 go into?', graph)).toEqual({ mode: 'local', entityIds: ['bolt'] });
  expect(mod.routeQuestion('What are the main supply risks across our portfolio?', graph)).toEqual({ mode: 'global' });
  expect(mod.routeQuestion('Do any kettles or globexes matter? Acmeco?', graph)).toEqual({ mode: 'global' });
});

test('answerLocal grounds the answer in the entity neighborhood up to the hop limit', async () => {
  const graph = supplyGraph();
  fakeModel.reply(respond.text('Acme supplies the bolt.'), respond.text('Acme bolts end up in the kettle.'));
  const oneHop = await mod.answerLocal(createModel(), 'What does Acme supply?', graph, ['acme']);
  expect(oneHop).toEqual({ mode: 'local', answer: 'Acme supplies the bolt.', entityIds: ['acme', 'bolt'] });
  const prompt = fakeModel.requests[0].messages.map((message: { content: string }) => message.content).join('\n');
  ['Acme', 'Bolt M4', 'Steel bolt.', 'SUPPLIES', 'What does Acme supply?'].forEach((text) => expect(prompt).toContain(text));
  ['Kettle', 'Globex', 'USED_IN'].forEach((text) => expect(prompt).not.toContain(text));
  const twoHops = await mod.answerLocal(createModel(), 'Where do Acme parts end up?', graph, ['acme'], { hops: 2 });
  expect(twoHops.entityIds).toEqual(['acme', 'bolt', 'kettle']);
  expect(fakeModel.requests[1].messages.map((message: { content: string }) => message.content).join('\n')).toContain('USED_IN');
});

test('answerGlobal maps batches of community reports to rated points, skips unusable batches and reduces the best points in score order', async () => {
  await forEachSeed(12, async () => {
    fakeModel.reply(
      respond.json({ points: [{ text: 'Single-source bolts', score: 90 }, { text: 'Minor packaging delay', score: 10 }] }),
      respond.oneOf([respond.malformedJson({ points: [{ text: 'Hidden point', score: 99 }] }), respond.refusal()]),
      respond.json({ points: [{ text: 'Plastics price spike', score: 70 }, { text: 'Irrelevant trivia', score: 0 }, { text: 'Regulatory change in REACH', score: 80 }] }),
      respond.text('Main risks: single-source bolts, REACH changes, plastics prices.'),
    );
    const result = await mod.answerGlobal(createModel(), 'What are the main supply risks?', reports(5), { batchSize: 2, maxPoints: 3 });
    const prompts = fakeModel.requests.map((request: { messages: Array<{ content: string }> }) => request.messages.map((message) => message.content).join('\n'));
    const malformedWasFenced = fakeModel.responses[1]?.text.includes('```') && fakeModel.responses[1].finishReason === 'stop';
    expect(prompts).toHaveLength(4);
    expect(prompts[0]).toContain('Report title 1');
    expect(prompts[0]).toContain('Report title 2');
    expect(prompts[0]).not.toContain('Report title 3');
    expect(prompts[2]).toContain('Report title 5');
    expect(prompts[2]).not.toContain('Report title 4');
    expect(fakeModel.requests[0].responseFormat).toEqual({ type: 'json' });
    const expected = malformedWasFenced
      ? ['Hidden point', 'Single-source bolts', 'Regulatory change in REACH']
      : ['Single-source bolts', 'Regulatory change in REACH', 'Plastics price spike'];
    expect(result.points.map((point: { text: string }) => point.text)).toEqual(expected);
    expect(result.answer).toBe('Main risks: single-source bolts, REACH changes, plastics prices.');
    const reduce = prompts[3];
    expected.forEach((text) => expect(reduce).toContain(text));
    expect(reduce.indexOf(expected[0])).toBeLessThan(reduce.indexOf(expected[1]));
    expect(reduce.indexOf(expected[1])).toBeLessThan(reduce.indexOf(expected[2]));
    ['Minor packaging delay', 'Irrelevant trivia'].forEach((text) => expect(reduce).not.toContain(text));
  });
});

test('answerGlobal returns no answer and skips the reduce call when no batch produced a useful point', async () => {
  fakeModel.reply(respond.json({ points: [{ text: 'Nothing relevant', score: 0 }] }), respond.text('no idea'), respond.text('should not be called'));
  const result = await mod.answerGlobal(createModel(), 'What are the main supply risks?', reports(3), { batchSize: 2 });
  expect(result).toEqual({ mode: 'global', answer: null, points: [] });
  expect(fakeModel.requests).toHaveLength(2);
});
