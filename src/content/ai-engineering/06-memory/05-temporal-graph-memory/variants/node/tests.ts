const DAY = 86_400_000;
const START = Date.UTC(2026, 0, 1);
const day = (offset: number) => START + offset * DAY;

function clock(startDay = 0) {
  let time = day(startDay);
  return { now: () => time, set: (offset: number) => (time = day(offset)) };
}

function memory(startDay = 0) {
  const time = clock(startDay);
  return { time, graph: mod.createTemporalMemory({ now: time.now, exclusivePredicates: ['works_at', 'lives_in'] }) };
}

const objects = (facts: Array<{ object: string }>) => facts.map((fact) => fact.object).sort();

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test('add records valid time and transaction time, and non-exclusive predicates accumulate', () => {
  const { graph } = memory(3);
  const acme = graph.add({ subject: 'ana', predicate: 'works_at', object: 'Acme', validFrom: day(0) });
  expect(acme).toEqual({ id: acme.id, subject: 'ana', predicate: 'works_at', object: 'Acme', validFrom: day(0), validTo: null, recordedAt: day(3), expiredAt: null });
  expect(typeof acme.id).toBe('string');
  graph.add({ subject: 'ana', predicate: 'likes', object: 'cycling', validFrom: day(1) });
  graph.add({ subject: 'ana', predicate: 'likes', object: 'hiking', validFrom: day(2) });
  expect(objects(graph.current('ana', 'likes'))).toEqual(['cycling', 'hiking']);
  expect(objects(graph.current('ana'))).toEqual(['Acme', 'cycling', 'hiking']);
  expect(graph.current('ben')).toEqual([]);
});

test('isValidAt and isKnownAt use half-open intervals, with null meaning still open', () => {
  const fact = { id: 'f', subject: 'ana', predicate: 'works_at', object: 'Acme', validFrom: day(10), validTo: day(20), recordedAt: day(12), expiredAt: day(30) };
  expect([day(9), day(10), day(19), day(20)].map((time) => mod.isValidAt(fact, time))).toEqual([false, true, true, false]);
  expect([day(11), day(12), day(29), day(30)].map((time) => mod.isKnownAt(fact, time))).toEqual([false, true, true, false]);
  const open = { ...fact, validTo: null, expiredAt: null };
  expect(mod.isValidAt(open, day(5000))).toBe(true);
  expect(mod.isKnownAt(open, day(5000))).toBe(true);
});

test('a contradiction on an exclusive predicate invalidates the old fact instead of deleting it', () => {
  const { time, graph } = memory(1);
  const acme = graph.add({ subject: 'ana', predicate: 'works_at', object: 'Acme', validFrom: day(0) });
  time.set(68);
  const globex = graph.add({ subject: 'ana', predicate: 'works_at', object: 'Globex', validFrom: day(59) });
  const records = graph.all();
  expect(records).toHaveLength(3);
  expect(records.find((fact: { id: string }) => fact.id === acme.id)).toEqual({ ...acme, expiredAt: day(68) });
  const closed = records.find((fact: { id: string; object: string }) => fact.object === 'Acme' && fact.id !== acme.id);
  expect(closed).toEqual({ id: closed.id, subject: 'ana', predicate: 'works_at', object: 'Acme', validFrom: day(0), validTo: day(59), recordedAt: day(68), expiredAt: null });
  expect(globex).toEqual(expect.objectContaining({ object: 'Globex', validFrom: day(59), validTo: null, recordedAt: day(68), expiredAt: null }));
  expect(objects(graph.current('ana', 'works_at'))).toEqual(['Globex']);
  expect(new Set(records.map((fact: { id: string }) => fact.id)).size).toBe(3);
});

test('asOf answers what was true at a valid time and what the memory believed at a transaction time', () => {
  const { time, graph } = memory(1);
  graph.add({ subject: 'ana', predicate: 'works_at', object: 'Acme', validFrom: day(0) });
  time.set(68);
  graph.add({ subject: 'ana', predicate: 'works_at', object: 'Globex', validFrom: day(59) });
  time.set(100);
  expect(objects(graph.asOf('ana', 'works_at', day(45)))).toEqual(['Acme']);
  expect(objects(graph.asOf('ana', 'works_at', day(59)))).toEqual(['Globex']);
  expect(objects(graph.asOf('ana', 'works_at', day(90)))).toEqual(['Globex']);
  expect(graph.asOf('ana', 'works_at', day(-5))).toEqual([]);
  expect(objects(graph.asOf('ana', 'works_at', day(64), day(64)))).toEqual(['Acme']);
  expect(graph.asOf('ana', 'works_at', day(64), day(64))[0].validTo).toBe(null);
  expect(objects(graph.asOf('ana', 'works_at', day(64), day(68)))).toEqual(['Globex']);
  expect(graph.asOf('ana', 'works_at', day(0), day(0))).toEqual([]);
});

test('restating a fact changes nothing, a late fact about the past ends where newer knowledge starts, and a same-time statement corrects', () => {
  const { time, graph } = memory(160);
  const porto = graph.add({ subject: 'ana', predicate: 'lives_in', object: 'Porto', validFrom: day(150) });
  time.set(170);
  expect(graph.add({ subject: 'ana', predicate: 'lives_in', object: 'Porto', validFrom: day(165) }).id).toBe(porto.id);
  expect(graph.all()).toHaveLength(1);

  time.set(180);
  const lisbon = graph.add({ subject: 'ana', predicate: 'lives_in', object: 'Lisbon', validFrom: day(0) });
  expect(lisbon.validTo).toBe(day(150));
  expect(graph.all().find((fact: { id: string }) => fact.id === porto.id)).toEqual(porto);
  expect(objects(graph.current('ana', 'lives_in'))).toEqual(['Porto']);
  expect(objects(graph.asOf('ana', 'lives_in', day(100)))).toEqual(['Lisbon']);

  time.set(190);
  graph.add({ subject: 'ana', predicate: 'lives_in', object: 'Braga', validFrom: day(150) });
  expect(graph.all().find((fact: { id: string }) => fact.id === porto.id).expiredAt).toBe(day(190));
  expect(graph.all().filter((fact: { object: string }) => fact.object === 'Porto')).toHaveLength(1);
  expect(objects(graph.current('ana', 'lives_in'))).toEqual(['Braga']);
  expect(objects(graph.asOf('ana', 'lives_in', day(160), day(185)))).toEqual(['Porto']);
});

test('over random histories nothing is deleted, exclusive facts never overlap, and past answers never change', () => {
  const subjects = ['ana', 'ben'];
  const predicates = ['works_at', 'lives_in', 'likes'];
  const values = ['Acme', 'Globex', 'Initech', 'Lisbon', 'Porto', 'jazz'];
  const probes = [0, 15, 30, 45, 60, 75, 90].map(day);
  for (let seed = 1; seed <= 12; seed++) {
    const random = seededRandom(seed);
    const { time, graph } = memory(0);
    const snapshots: Array<{ knownAt: number; answers: string }> = [];
    let recordCount = 0;
    const answersAt = (knownAt: number) =>
      JSON.stringify(subjects.flatMap((subject) => predicates.flatMap((predicate) => probes.map((validAt) => graph.asOf(subject, predicate, validAt, knownAt).map((fact: { id: string }) => fact.id).sort()))));
    for (let step = 1; step <= 40; step++) {
      time.set(step * 3);
      graph.add({
        subject: subjects[Math.floor(random() * subjects.length)],
        predicate: predicates[Math.floor(random() * predicates.length)],
        object: values[Math.floor(random() * values.length)],
        validFrom: day(Math.floor(random() * 90)),
      });
      const records = graph.all();
      expect(records.length).toBeGreaterThanOrEqual(recordCount);
      recordCount = records.length;
      snapshots.push({ knownAt: day(step * 3), answers: answersAt(day(step * 3)) });
      for (const subject of subjects) {
        for (const predicate of ['works_at', 'lives_in']) {
          const believed = records.filter((fact: { subject: string; predicate: string; expiredAt: number | null }) => fact.subject === subject && fact.predicate === predicate && fact.expiredAt === null);
          believed.forEach((left: { id: string; validFrom: number; validTo: number | null }) =>
            believed.forEach((right: { id: string; validFrom: number; validTo: number | null }) => {
              if (left.id !== right.id) {
                const overlap = left.validFrom < (right.validTo ?? Infinity) && right.validFrom < (left.validTo ?? Infinity);
                expect(overlap).toBe(false);
              }
            }),
          );
        }
      }
    }
    snapshots.forEach((snapshot) => expect(answersAt(snapshot.knownAt)).toBe(snapshot.answers));
  }
});
