import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../../src/content/languages.ts';
import { CODEQL_LANGUAGES, STRUCTURE_SUITE, affectedChecks, readTracks } from './affected-checks.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const tracks = readTracks(ROOT);
const allSuites = [STRUCTURE_SUITE, ...tracks.map((track) => track.id)];

function checksFor(...changedFiles) {
  return affectedChecks({ changedFiles, tracks, fullRun: false });
}

describe('readTracks', () => {
  it('reads every track with the engines that grade it', () => {
    expect(tracks.find((track) => track.id === 'react')).toEqual({ id: 'react', engines: ['react'] });
    expect(tracks.find((track) => track.id === 'system-design')).toEqual({ id: 'system-design', engines: ['node', 'python', 'csharp'] });
  });

  it('names only engines that exist, and each language is graded by the engine of the same id', () => {
    for (const engine of tracks.flatMap((track) => track.engines)) {
      expect(existsSync(resolve(ROOT, 'src/engines', engine)), engine).toBe(true);
    }
    for (const [language, { engine }] of Object.entries(LANGUAGES)) {
      expect(engine).toBe(language);
    }
  });
});

describe('affectedChecks', () => {
  it('runs everything on a full run', () => {
    expect(affectedChecks({ changedFiles: [], tracks, fullRun: true })).toEqual({
      suites: allSuites,
      python: true,
      code: true,
      workflows: true,
      dependencies: true,
      codeql: CODEQL_LANGUAGES,
    });
  });

  it('runs no code check for a documentation-only change', () => {
    expect(checksFor('README.md', '.claude/docs/ARCHITECTURE.md', '.coderabbit.yaml')).toEqual({
      suites: [],
      python: false,
      code: false,
      workflows: false,
      dependencies: false,
      codeql: [],
    });
  });

  it('treats the Claude Code hooks as code', () => {
    expect(checksFor('.claude/hooks/docs-sync.mjs')).toMatchObject({ code: true, codeql: ['javascript-typescript'], suites: [] });
  });

  it('verifies only the track whose lesson changed, plus the structure suite', () => {
    expect(checksFor('src/content/react/02-hooks/01-use-state/theory.md')).toMatchObject({ suites: [STRUCTURE_SUITE, 'react'], python: false, codeql: [] });
  });

  it('runs pytest for a Python lesson but leaves lesson code out of CodeQL', () => {
    expect(checksFor('src/content/python/01-basics/02-variables/solution.py')).toMatchObject({ suites: [STRUCTURE_SUITE, 'python'], python: true, codeql: [] });
  });

  it('verifies every track graded by a changed engine', () => {
    expect(checksFor('src/engines/react/adapter.ts').suites).toEqual([STRUCTURE_SUITE, 'architecture', 'react', 'react-state']);
    expect(checksFor('src/engines/python/worker.ts')).toMatchObject({ suites: [STRUCTURE_SUITE, 'ai-engineering', 'python', 'system-design'], python: true });
  });

  it('runs only the suite of a changed track test file', () => {
    expect(checksFor('src/verify/node.test.ts').suites).toEqual(['node']);
  });

  it('verifies every track when a shared verify helper changes', () => {
    expect(checksFor('src/verify/challengeSuite.ts').suites).toEqual(allSuites);
  });

  it('verifies every track when a shared engine file or the content loader changes', () => {
    expect(checksFor('src/engines/shared/runner.ts').suites).toEqual(allSuites);
    expect(checksFor('src/content/loader.ts').suites).toEqual(allSuites);
  });

  it('runs everything plus the dependency scans for a lockfile change', () => {
    expect(checksFor('package-lock.json')).toMatchObject({ suites: allSuites, python: true, dependencies: true });
  });

  it('lints workflows and runs CodeQL for actions when a workflow changes', () => {
    expect(checksFor('.github/workflows/security.yml')).toMatchObject({ suites: [], workflows: true, codeql: ['actions'] });
    expect(checksFor('.github/workflows/ci.yml')).toMatchObject({ suites: allSuites, workflows: true });
  });

  it('runs the code checks but no verify suite for a UI change', () => {
    expect(checksFor('src/features/lesson/LessonPanel.tsx')).toMatchObject({ suites: [], code: true, python: false, codeql: ['javascript-typescript'] });
  });

  it('runs the structure suite for the track accents and the curriculum', () => {
    expect(checksFor('src/shared/design/tokens.css').suites).toEqual([STRUCTURE_SUITE]);
    expect(checksFor('.claude/docs/CURRICULUM.md')).toMatchObject({ suites: [STRUCTURE_SUITE], code: false });
  });

  it('counts both tracks of a lesson moved between tracks', () => {
    expect(checksFor('src/content/react/03-x/01-y/meta.json', 'src/content/react-state/03-x/01-y/meta.json').suites).toEqual([STRUCTURE_SUITE, 'react', 'react-state']);
  });

  it('runs pytest for the Python harness tests', () => {
    expect(checksFor('tests/python/test_harness.py')).toMatchObject({ suites: [], python: true, codeql: ['python'] });
  });
});
