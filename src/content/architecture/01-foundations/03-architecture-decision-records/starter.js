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
  // TODO: only a proposed ADR can be accepted; return a new record instead of changing adr
  adr.status = 'accepted';
  return adr;
}

export function supersede(log, oldId, newAdr) {
  // TODO: find the old ADR, validate it, mark it superseded and append the accepted newAdr in a new array
  return log;
}

export function toMarkdown(adr) {
  // TODO: render the title, Status, Context, Decision and Consequences sections
  return `# ${adr.title}`;
}
