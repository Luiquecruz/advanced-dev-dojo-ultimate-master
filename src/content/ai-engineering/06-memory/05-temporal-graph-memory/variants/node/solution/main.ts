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
  return fact.validFrom <= validAt && (fact.validTo === null || validAt < fact.validTo);
}

export function isKnownAt(fact: Fact, knownAt: number): boolean {
  return fact.recordedAt <= knownAt && (fact.expiredAt === null || knownAt < fact.expiredAt);
}

export function createTemporalMemory({ now = Date.now, exclusivePredicates = [] }: TemporalMemoryOptions = {}) {
  const facts: Fact[] = [];
  const exclusive = new Set(exclusivePredicates);
  let created = 0;

  const believed = () => facts.filter((fact) => fact.expiredAt === null);
  const record = (input: FactInput, validTo: number | null, recordedAt: number): Fact => {
    const fact: Fact = { ...input, id: `fact-${++created}`, validTo, recordedAt, expiredAt: null };
    facts.push(fact);
    return fact;
  };

  return {
    add(input: FactInput): Fact {
      const time = now();
      const sameRelation = believed().filter((fact) => fact.subject === input.subject && fact.predicate === input.predicate);
      const restated = sameRelation.find((fact) => fact.object === input.object && fact.validFrom <= input.validFrom && fact.validTo === null);
      if (restated) {
        return { ...restated };
      }
      let validTo: number | null = null;
      if (exclusive.has(input.predicate)) {
        const later = sameRelation.filter((fact) => fact.validFrom > input.validFrom).map((fact) => fact.validFrom);
        validTo = later.length > 0 ? Math.min(...later) : null;
        for (const fact of sameRelation) {
          if (fact.validFrom === input.validFrom) {
            fact.expiredAt = time;
          } else if (fact.validFrom < input.validFrom && (fact.validTo === null || fact.validTo > input.validFrom)) {
            fact.expiredAt = time;
            record(fact, input.validFrom, time);
          }
        }
      }
      return { ...record(input, validTo, time) };
    },
    current(subject: string, predicate?: string): Fact[] {
      return believed()
        .filter((fact) => fact.subject === subject && (predicate === undefined || fact.predicate === predicate) && fact.validTo === null)
        .map((fact) => ({ ...fact }));
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
