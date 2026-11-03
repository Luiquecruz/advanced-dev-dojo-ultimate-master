export interface FactInput {
  subject: string;
  predicate: string;
  object: string;
  validFrom: number;
}

export interface Fact extends FactInput {
  id: string;
  validTo: number | null;
  recordedAt: number;
  expiredAt: number | null;
}

export interface TemporalMemoryOptions {
  now?: () => number;
  exclusivePredicates?: string[];
}

export function isValidAt(fact: Fact, validAt: number): boolean {
  // TODO: true from validFrom (inclusive) until validTo (exclusive); a null validTo is still true
  return fact.validFrom <= validAt;
}

export function isKnownAt(fact: Fact, knownAt: number): boolean {
  // TODO: true from recordedAt (inclusive) until expiredAt (exclusive); a null expiredAt is still believed
  return true;
}

export function createTemporalMemory({ now = Date.now, exclusivePredicates = [] }: TemporalMemoryOptions = {}) {
  let facts: Fact[] = [];
  const exclusive = new Set(exclusivePredicates);
  let created = 0;

  return {
    add(input: FactInput): Fact {
      // TODO: ignore restated facts; for exclusive predicates expire contradicted facts and record closed copies instead of deleting them
      if (exclusive.has(input.predicate)) {
        facts = facts.filter((fact) => !(fact.subject === input.subject && fact.predicate === input.predicate));
      }
      const fact: Fact = { ...input, id: `fact-${++created}`, validTo: null, recordedAt: now(), expiredAt: null };
      facts.push(fact);
      return { ...fact };
    },
    current(subject: string, predicate?: string): Fact[] {
      // TODO: only believed facts (expiredAt null) that are still true (validTo null)
      return facts.filter((fact) => fact.subject === subject && (predicate === undefined || fact.predicate === predicate)).map((fact) => ({ ...fact }));
    },
    asOf(subject: string, predicate: string, validAt: number, knownAt: number = now()): Fact[] {
      return facts
        .filter((fact) => fact.subject === subject && fact.predicate === predicate && isValidAt(fact, validAt) && isKnownAt(fact, knownAt))
        .map((fact) => ({ ...fact }));
    },
    all(): Fact[] {
      return facts.map((fact) => ({ ...fact }));
    },
  };
}
