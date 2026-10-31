import { beforeAll, describe, expect, it } from 'vitest';
import { trackById, type LanguageId } from '../content';
import { installLoopGuard } from '../engines/shared/compile';
import { installFakeApi } from '../engines/shared/fakeApi';
import { listTestNames, runTests, type FrameworkAdapter } from '../engines/shared/testRunner';

/**
 * Verifies that every challenge of a framework track passes with its solution and fails with its starter. Multi-language tracks call it once per language.
 */
export function defineChallengeSuite(trackId: string, adapter: FrameworkAdapter, language?: LanguageId): void {
  const filter = process.env.LESSON;
  const challenges = (trackById.get(trackId)?.lessons ?? [])
    .filter((lesson) => !filter || lesson.id.includes(filter))
    .flatMap((lesson) => lesson.variants.filter((variant) => variant.language === language).map((challenge) => ({ lesson, challenge })));

  beforeAll(() => {
    installLoopGuard(globalThis);
    installFakeApi(globalThis, { delay: 5 });
    window.matchMedia ??= (query: string) =>
      ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList;
  });

  if (challenges.length === 0) {
    it.skip(`no ${trackId} challenges match`, () => undefined);
    return;
  }

  const suiteName = language ? `${trackId}/%s [${language}]` : `${trackId}/%s`;
  describe.each(challenges.map(({ lesson, challenge }) => [lesson.id, challenge] as const))(suiteName, (_, challenge) => {
    const names = listTestNames(challenge.tests);

    it('declares tests', () => {
      expect(names.length).toBeGreaterThan(0);
      expect(Object.keys(challenge.starter)).toContain(challenge.entry);
      expect(Object.keys(challenge.solution)).toContain(challenge.entry);
    });

    it('solution passes every test', async () => {
      const report = await runTests(adapter, { files: challenge.solution, entry: challenge.entry, tests: challenge.tests });
      expect(report.compileError).toBeUndefined();
      expect(report.results.filter((result) => !result.passed)).toEqual([]);
      expect(report.results.length).toBe(names.length);
    });

    it('starter fails at least one test', async () => {
      const report = await runTests(adapter, { files: challenge.starter, entry: challenge.entry, tests: challenge.tests });
      expect(report.compileError !== undefined || report.results.some((result) => !result.passed)).toBe(true);
    });
  });
}
