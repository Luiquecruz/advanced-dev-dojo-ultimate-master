// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { trackById } from '../content';
import { combineResults, splitTests } from '../engines/typescript/grader';
import { runRuntimeTests } from '../engines/typescript/runtime';
import { createStaticAnalyzer } from '../engines/typescript/staticAnalysis';
import { parseTypeScriptTests } from '../engines/typescript/testsDsl';
import type { ChallengeTest } from '../engines/typescript/types';

const libraryDirectory = dirname(createRequire(import.meta.url).resolve('typescript'));
const libraries = Object.fromEntries(
  readdirSync(libraryDirectory)
    .filter((name) => /^lib\..*\.d\.ts$/.test(name))
    .map((name) => [name, readFileSync(join(libraryDirectory, name), 'utf8')]),
);
const analyzer = createStaticAnalyzer(ts, libraries);

async function grade(code: string, tests: ChallengeTest[]) {
  const { typeTests, runtimeTests, patternTests } = splitTests(tests);
  const analysis = analyzer.analyze({ code, typeTests, patternTests });
  const runtime = await runRuntimeTests(analysis.javascript, runtimeTests);
  return combineResults(tests, analysis, runtime);
}

const filter = process.env.LESSON;
const lessons = (trackById.get('typescript')?.lessons ?? []).filter((lesson) => lesson.challenge && (!filter || lesson.id.includes(filter)));

describe.each(lessons.map((lesson) => [lesson.id, lesson] as const))('typescript/%s', (_, lesson) => {
  const challenge = lesson.challenge!;
  const tests = parseTypeScriptTests(challenge.tests);

  it('declares at least 2 tests and TODO markers', () => {
    expect(tests.length).toBeGreaterThanOrEqual(2);
    expect(challenge.starter[challenge.entry]).toContain('// TODO');
  });

  it('solution passes every test', async () => {
    const result = await grade(challenge.solution[challenge.entry], tests);
    expect(result.tests.filter((test) => !test.passed)).toEqual([]);
  });

  it('starter fails at least one test', async () => {
    const result = await grade(challenge.starter[challenge.entry], tests);
    expect(result.passed).toBe(false);
  });
});
