const { createAdr, accept, supersede, toMarkdown } = mod;

function proposal(id, title) {
  return createAdr({
    id,
    title,
    context: `Context of ${title}`,
    decision: `We will ${title.toLowerCase()}`,
    consequences: `Consequences of ${title}`,
  });
}

function acceptedLog() {
  return [accept(proposal(1, 'Render the dashboard as a SPA')), accept(proposal(2, 'Use a global store for server data'))];
}

function contentLines(markdown) {
  return markdown
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

test('accept returns a new accepted record and leaves the proposal untouched', () => {
  const draft = proposal(3, 'Use TanStack Query');
  const accepted = accept(draft);
  expect(accepted).not.toBe(draft);
  expect(accepted).toEqual({ ...draft, status: 'accepted' });
  expect(draft.status).toBe('proposed');
});

test('accept throws "Cannot accept" for an ADR that is not proposed', () => {
  const accepted = accept(proposal(3, 'Use TanStack Query'));
  expect(() => accept(accepted)).toThrow('Cannot accept');
  expect(() => accept({ ...accepted, status: 'superseded' })).toThrow('Cannot accept');
});

test('supersede returns a new log: the old ADR is superseded and the new one is appended as accepted', () => {
  const log = acceptedLog();
  const snapshot = JSON.parse(JSON.stringify(log));
  const next = supersede(log, 2, proposal(3, 'Use TanStack Query for server state'));
  expect(next).not.toBe(log);
  expect(next).toHaveLength(3);
  expect(next[0]).toBe(log[0]);
  expect(next[1]).toEqual({ ...snapshot[1], status: 'superseded', supersededBy: 3 });
  expect(next[2]).toEqual(expect.objectContaining({ id: 3, status: 'accepted', supersedes: 2, supersededBy: null }));
  expect(log).toEqual(snapshot);
});

test('supersede rejects unknown ids and ADRs that are not accepted', () => {
  const log = [...acceptedLog(), proposal(3, 'Adopt micro-frontends')];
  expect(() => supersede(log, 42, proposal(4, 'Anything'))).toThrow('not found');
  expect(() => supersede(log, 3, proposal(4, 'Anything'))).toThrow('Cannot supersede');
  const superseded = supersede(acceptedLog(), 2, proposal(3, 'Use TanStack Query'));
  expect(() => supersede(superseded, 2, proposal(4, 'Anything'))).toThrow('Cannot supersede');
});

test('toMarkdown renders the Nygard sections in order', () => {
  const adr = accept(
    createAdr({
      id: 7,
      title: 'Use TanStack Query for server state',
      context: 'Server data is copied into a global store.',
      decision: 'We will cache server data with TanStack Query.',
      consequences: 'The team must learn query keys.',
    }),
  );
  expect(contentLines(toMarkdown(adr))).toEqual([
    '# 7. Use TanStack Query for server state',
    '## Status',
    'Accepted',
    '## Context',
    'Server data is copied into a global store.',
    '## Decision',
    'We will cache server data with TanStack Query.',
    '## Consequences',
    'The team must learn query keys.',
  ]);
});

test('toMarkdown shows Proposed and "Superseded by ADR <id>" status lines', () => {
  expect(contentLines(toMarkdown(proposal(5, 'Adopt islands')))[2]).toBe('Proposed');
  const next = supersede(acceptedLog(), 1, proposal(3, 'Render the dashboard with SSR'));
  expect(contentLines(toMarkdown(next[0]))[2]).toBe('Superseded by ADR 3');
  expect(contentLines(toMarkdown(next[2]))[2]).toBe('Accepted');
});
