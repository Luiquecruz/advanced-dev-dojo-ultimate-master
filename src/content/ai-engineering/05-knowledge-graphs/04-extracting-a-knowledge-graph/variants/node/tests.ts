const { createModel } = require('@dojo/ai');

const ONTOLOGY = {
  classes: ['Person', 'Organization', 'Product'],
  relations: [
    { name: 'worksFor', domain: 'Person', range: 'Organization' },
    { name: 'makes', domain: 'Organization', range: 'Product' },
    { name: 'acquired', domain: 'Organization', range: 'Organization' },
  ],
};

const MEMO = 'Ana Souza leads research at Acme Corp. Acme makes the Roadrunner drone.';

const MEMO_EXTRACTION = {
  entities: [
    { name: 'Ana Souza', type: 'Person' },
    { name: 'Acme Corp', type: 'Organization', aliases: ['Acme'] },
    { name: 'Roadrunner', type: 'Product' },
  ],
  relations: [
    { source: 'Ana Souza', type: 'worksFor', target: 'Acme Corp' },
    { source: 'Acme', type: 'makes', target: 'Roadrunner' },
  ],
};

test('normalizeName lowercases, strips accents and punctuation, and drops a leading "the" and trailing legal suffixes', () => {
  expect(mod.normalizeName('  Ácme   Corp. ')).toBe('acme');
  expect(mod.normalizeName('ACME Corporation')).toBe('acme');
  expect(mod.normalizeName('The Acme Company, Inc.')).toBe('acme');
  expect(mod.normalizeName('José  Álvarez-Núñez')).toBe('jose alvarez nunez');
  expect(mod.normalizeName('Initech LLC')).toBe('initech');
  expect(mod.normalizeName('Co')).toBe('co');
  expect(mod.normalizeName('The')).toBe('the');
  expect(mod.normalizeName('Roadrunner 2')).toBe('roadrunner 2');
  expect(mod.normalizeName('!!!')).toBe('');
});

test('parseExtraction reads JSON wrapped in prose or a code fence and rejects broken or incomplete JSON with an ExtractionError', async () => {
  const json = JSON.stringify(MEMO_EXTRACTION);
  expect(mod.parseExtraction(json)).toEqual(MEMO_EXTRACTION);
  expect(mod.parseExtraction(`Sure! Here it is:\n\`\`\`json\n${json}\n\`\`\``)).toEqual(MEMO_EXTRACTION);
  const broken = [json.slice(0, 40), json.replace(/}$/, ',}'), json.replace(/"/g, "'"), 'No entities found.', '{"entities": []}', '{"entities": {}, "relations": []}'];
  for (const text of broken) {
    expect(await captureError(() => mod.parseExtraction(text))).toBeInstanceOf(mod.ExtractionError);
  }
});

test('extractGraph asks for JSON with the ontology classes and relations in the prompt and the document as the user message', async () => {
  fakeModel.reply(respond.json(MEMO_EXTRACTION));
  const extraction = await mod.extractGraph(createModel(), MEMO, ONTOLOGY);
  expect(extraction).toEqual(MEMO_EXTRACTION);
  const [request] = fakeModel.requests;
  expect(request.responseFormat).toEqual({ type: 'json' });
  expect(request.messages[0].role).toBe('system');
  for (const name of ['Person', 'Organization', 'Product', 'worksFor', 'makes', 'acquired']) {
    expect(request.messages[0].content).toContain(name);
  }
  expect(request.messages[request.messages.length - 1]).toEqual({ role: 'user', content: MEMO });
});

test('extractGraph survives every malformed JSON shape by re-asking once with the bad reply in the history', async () => {
  let retried = 0;
  await forEachSeed(24, async () => {
    fakeModel.reply(respond.malformedJson(MEMO_EXTRACTION), respond.json(MEMO_EXTRACTION));
    const extraction = await mod.extractGraph(createModel(), MEMO, ONTOLOGY);
    expect(extraction).toEqual(MEMO_EXTRACTION);
    const [first, second] = fakeModel.requests;
    if (second === undefined) {
      expect(fakeModel.responses[0].text).toContain('```');
      return;
    }
    retried += 1;
    expect(fakeModel.requests).toHaveLength(2);
    expect(second.messages.slice(0, first.messages.length)).toEqual(first.messages);
    expect(second.messages[first.messages.length]).toEqual({ role: 'assistant', content: fakeModel.responses[0].text });
    expect(second.messages[second.messages.length - 1].role).toBe('user');
  });
  expect(retried).toBeGreaterThan(0);
});

test('extractGraph fails with an ExtractionError after maxAttempts unusable replies, and immediately on a refusal', async () => {
  fakeModel.reply(respond.text('I found Ana and Acme.'), respond.truncated(JSON.stringify(MEMO_EXTRACTION)), respond.text('{"entities": []}'), respond.json(MEMO_EXTRACTION));
  const error = await captureError(mod.extractGraph(createModel(), MEMO, ONTOLOGY, { maxAttempts: 3 }));
  expect(error).toBeInstanceOf(mod.ExtractionError);
  expect(fakeModel.requests).toHaveLength(3);

  fakeModel.reset().reply(respond.refusal(), respond.json(MEMO_EXTRACTION));
  expect(await captureError(mod.extractGraph(createModel(), MEMO, ONTOLOGY))).toBeInstanceOf(mod.ExtractionError);
  expect(fakeModel.requests).toHaveLength(1);
});

test('validateExtraction accepts what fits the ontology and rejects the rest with a reason naming the problem', () => {
  const extraction = {
    entities: [
      { name: 'Ana Souza', type: 'Person' },
      { name: 'Acme Corp', type: 'Organization', aliases: ['Acme'] },
      { name: 'Roadrunner', type: 'Product' },
      { name: 'Berlin', type: 'City' },
      { name: '  ', type: 'Person' },
    ],
    relations: [
      { source: 'Ana Souza', type: 'worksFor', target: 'ACME' },
      { source: 'Acme', type: 'makes', target: 'Roadrunner' },
      { source: 'Ana Souza', type: 'livesIn', target: 'Berlin' },
      { source: 'Acme Corp', type: 'acquired', target: 'Globex' },
      { source: 'Roadrunner', type: 'worksFor', target: 'Acme' },
      { source: 'Acme', type: 'makes', target: 'Ana Souza' },
    ],
  };
  const { accepted, rejected } = mod.validateExtraction(extraction, ONTOLOGY);
  expect(accepted.entities.map((entity: { name: string }) => entity.name)).toEqual(['Ana Souza', 'Acme Corp', 'Roadrunner']);
  expect(accepted.relations).toEqual([extraction.relations[0], extraction.relations[1]]);
  expect(rejected.map((rejection: { item: unknown }) => rejection.item)).toEqual([
    extraction.entities[3],
    extraction.entities[4],
    extraction.relations[2],
    extraction.relations[3],
    extraction.relations[4],
    extraction.relations[5],
  ]);
  const reasons = rejected.map((rejection: { reason: string }) => rejection.reason);
  expect(reasons[0]).toContain('City');
  expect(reasons[2]).toContain('livesIn');
  expect(reasons[3]).toContain('Globex');
  expect(reasons[4]).toContain('Person');
  expect(reasons[5]).toContain('Product');
});

test('mergeExtraction resolves entities across documents by normalized name and alias, keeps aliases and provenance, and deduplicates relations', () => {
  const graph = mod.createKnowledgeGraph();
  const first = mod.mergeExtraction(graph, MEMO_EXTRACTION, 'memo-1');
  expect(first).toEqual({ created: 3, merged: 0, relationsAdded: 2 });
  const second = mod.mergeExtraction(graph, {
    entities: [
      { name: 'ACME Corporation', type: 'Organization' },
      { name: 'Ána Souza', type: 'Person' },
      { name: 'Globex Inc.', type: 'Organization' },
    ],
    relations: [
      { source: 'Ána Souza', type: 'worksFor', target: 'ACME Corporation' },
      { source: 'ACME Corporation', type: 'acquired', target: 'Globex Inc.' },
    ],
  }, 'report-7');
  expect(second).toEqual({ created: 1, merged: 2, relationsAdded: 1 });
  expect(mod.mergeExtraction(graph, { entities: [{ name: 'Acme', type: 'Product' }], relations: [] }, 'catalog-9')).toEqual({ created: 1, merged: 0, relationsAdded: 0 });
  expect(mod.mergeExtraction(graph, MEMO_EXTRACTION, 'memo-1')).toEqual({ created: 0, merged: 3, relationsAdded: 0 });

  const acme = mod.resolveEntity(graph, 'acme corp.', 'Organization');
  expect(acme).toEqual({ id: 'organization:acme', name: 'Acme Corp', type: 'Organization', aliases: ['Acme', 'ACME Corporation'], sources: ['memo-1', 'report-7'] });
  expect(mod.resolveEntity(graph, 'ACME', 'Product').id).toBe('product:acme');
  expect(mod.resolveEntity(graph, 'Initech', 'Organization')).toBeUndefined();
  expect(graph.entities.map((entity: { id: string }) => entity.id)).toEqual(['person:ana-souza', 'organization:acme', 'product:roadrunner', 'organization:globex', 'product:acme']);
  expect(graph.relations).toEqual([
    { source: 'person:ana-souza', type: 'worksFor', target: 'organization:acme', sources: ['memo-1', 'report-7'] },
    { source: 'organization:acme', type: 'makes', target: 'product:roadrunner', sources: ['memo-1'] },
    { source: 'organization:acme', type: 'acquired', target: 'organization:globex', sources: ['report-7'] },
  ]);
});

test('buildKnowledgeGraph validates and merges every document, logs rejected facts with their document and keeps going after a failed extraction', async () => {
  await forEachSeed(10, async () => {
    const pressExtraction = {
      entities: [{ name: 'ACME Corporation', type: 'Organization' }, { name: 'Berlin', type: 'City' }],
      relations: [{ source: 'ACME Corporation', type: 'locatedIn', target: 'Berlin' }],
    };
    fakeModel.handle((request: { messages: Array<{ role: string; content: string }> }) => {
      const document = request.messages.find((message) => message.role === 'user')!.content;
      const isRetry = request.messages.some((message) => message.role === 'assistant');
      if (document === MEMO) {
        return respond.json(MEMO_EXTRACTION);
      }
      if (document.startsWith('ACME')) {
        return isRetry ? respond.json(pressExtraction) : respond.malformedJson(pressExtraction);
      }
      return respond.refusal();
    });
    const documents = [
      { id: 'memo-1', text: MEMO },
      { id: 'press-2', text: 'ACME Corporation opened an office in Berlin.' },
      { id: 'leak-3', text: 'Confidential salary list.' },
    ];
    const result = await mod.buildKnowledgeGraph(createModel(), documents, ONTOLOGY);
    expect(result.graph.entities.map((entity: { id: string }) => entity.id)).toEqual(['person:ana-souza', 'organization:acme', 'product:roadrunner']);
    expect(mod.resolveEntity(result.graph, 'Acme', 'Organization').sources).toEqual(['memo-1', 'press-2']);
    expect(result.graph.relations).toHaveLength(2);
    expect(result.rejected.map((rejection: { documentId: string; item: { name?: string; type: string } }) => `${rejection.documentId}:${rejection.item.name ?? rejection.item.type}`)).toEqual([
      'press-2:Berlin',
      'press-2:locatedIn',
    ]);
    expect(result.failed.map((failure: { documentId: string }) => failure.documentId)).toEqual(['leak-3']);
    expect(result.failed[0].reason.length).toBeGreaterThan(0);
  });
});
