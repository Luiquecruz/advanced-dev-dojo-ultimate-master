const TEXT_FIELDS = ['title', 'context', 'decision', 'consequences'];

export function createAdr({ id, title, context, decision, consequences }) {
  const fields = { title, context, decision, consequences };
  const missing = TEXT_FIELDS.filter((field) => !fields[field]);
  if (missing.length > 0) {
    throw new Error(`ADR ${id} is missing: ${missing.join(', ')}`);
  }
  return { id, title, status: 'proposed', context, decision, consequences, supersedes: null, supersededBy: null };
}

export function accept(adr) {
  if (adr.status !== 'proposed') {
    throw new Error(`Cannot accept ADR ${adr.id}: it is ${adr.status}`);
  }
  return { ...adr, status: 'accepted' };
}

export function supersede(log, oldId, newAdr) {
  const previous = log.find((adr) => adr.id === oldId);
  if (!previous) {
    throw new Error(`ADR ${oldId} not found`);
  }
  if (previous.status !== 'accepted') {
    throw new Error(`Cannot supersede ADR ${oldId}: it is ${previous.status}`);
  }
  const replacement = { ...accept(newAdr), supersedes: oldId };
  const updatedLog = log.map((adr) =>
    adr.id === oldId ? { ...adr, status: 'superseded', supersededBy: replacement.id } : adr,
  );
  return [...updatedLog, replacement];
}

function statusLine(adr) {
  if (adr.status === 'superseded') {
    return `Superseded by ADR ${adr.supersededBy}`;
  }
  return adr.status.charAt(0).toUpperCase() + adr.status.slice(1);
}

export function toMarkdown(adr) {
  return [
    `# ${adr.id}. ${adr.title}`,
    '',
    '## Status',
    '',
    statusLine(adr),
    '',
    '## Context',
    '',
    adr.context,
    '',
    '## Decision',
    '',
    adr.decision,
    '',
    '## Consequences',
    '',
    adr.consequences,
    '',
  ].join('\n');
}
