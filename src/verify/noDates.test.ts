import { describe, expect, it } from 'vitest';
import { allLessons } from '../content/allContent';
import { datedIn, datedTextsOf } from './noDates';

/** No lesson carries a changelog or a date that ages it (CONTENT_GUIDE.md "No dates"). */
describe('no dates in lessons', () => {
  it.each(allLessons.map((lesson) => [lesson.key, lesson] as const))('%s carries no dated text', (_, lesson) => {
    expect(datedTextsOf(lesson)).toEqual([]);
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
    expect(datedIn('The \\` marker was introduced in 2025; use `marker` here.')).toBe('in 2025');
    expect(datedIn('> ```text\n> shipped 2026-07-15\n> ```')).toBeUndefined();
    expect(datedIn('| Field | Note |\n| --- | --- |\n| `date` | Status as of today |')).toBe('Status as of');
  });
});
