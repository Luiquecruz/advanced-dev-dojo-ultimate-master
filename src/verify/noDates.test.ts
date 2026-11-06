import { describe, expect, it } from 'vitest';
import { allLessons } from '../content/allContent';
import { DATED_PENDING } from './datedPending';
import { datedIn, datedTextsOf } from './noDates';

/** The most lessons DATED_PENDING may hold. Lower it with every rewrite; raising it needs a review, so the list cannot grow quietly. */
const PENDING_LIMIT = 264;

/**
 * No lesson carries a changelog or a date that ages it (CONTENT_GUIDE.md "No dates"). Lessons written before the rule are listed in
 * DATED_PENDING and shrink as their tracks are rewritten: a lesson that is not listed fails on its first dated text, and a listed
 * lesson that is clean fails until its entry is removed, so the list can only get shorter.
 */
describe('no dates in lessons', () => {
  it.each(allLessons.map((lesson) => [lesson.key, lesson] as const))('%s carries no dated text', (key, lesson) => {
    const dated = datedTextsOf(lesson);
    if (DATED_PENDING.has(key)) {
      expect(dated.length, `${key} is clean: remove it from DATED_PENDING`).toBeGreaterThan(0);
      return;
    }
    expect(dated).toEqual([]);
  });

  it('does not let the pending list grow', () => {
    expect(DATED_PENDING.size).toBeLessThanOrEqual(PENDING_LIMIT);
  });

  it('lists only lessons that exist', () => {
    const keys = new Set(allLessons.map((lesson) => lesson.key));
    expect([...DATED_PENDING].filter((key) => !keys.has(key))).toEqual([]);
  });

  it('ignores dates inside code and finds them in prose', () => {
    expect(datedIn('Parse `2026-07-15` and\n```ts\nnew Date("2026-07-15");\n```')).toBeUndefined();
    expect(datedIn('Status as of October 2026: the model ships in 2025-11-02.')).toBeDefined();
    expect(datedIn('Keep a changelog so readers see what changed.')).toBe('changelog');
    expect(datedIn('A queue drains 2,000 requests per second, version 4 of the protocol.')).toBeUndefined();
    expect(datedIn("```ts\nconst marker = '```';\nconst date = '2026-07-15';\n```")).toBeUndefined();
    expect(datedIn('```ts\nconst a = 1;\n```\nStatus as of today')).toBe('Status as of');
    expect(datedIn('Parse ``2026-07-15`` and ` 2026-07-15 `.')).toBeUndefined();
    expect(datedIn('A tick ` then 2026-07-15 outside')).toBe('2026-07-15');
  });
});
