import type { EngineId } from '../content/types';
import { listCsharpTestNames } from './csharp/testNames';
import { listPythonTestNames } from './python/testNames';
import { listTestNames } from './shared/testNames';
import { parseTypeScriptTests } from './typescript/testsDsl';

/**
 * How one engine's test file is written: everything the editor and lesson verification need to read it without running it.
 */
export interface TestFileConventions {
  /** File name of the tests in a lesson folder or a `variants/<language>/` folder. */
  file: string;
  /** Test names in source order, the order the engine runs them. */
  listTestNames(tests: string): string[];
  /** Line comment that opens a marker such as `// beginner mistake: …`, and the start of a line that declares a test (after indentation). */
  marker?: { lineComment: string; declaration: RegExp };
  /** Block comments and docstrings, removed before markers are read, so a commented-out test never counts. */
  blockComment?: RegExp;
}

const JAVASCRIPT_TESTS = {
  listTestNames,
  marker: { lineComment: '//', declaration: /^(?:test|it)\(/ },
  blockComment: /\/\*[\s\S]*?\*\//g,
} as const;

/**
 * The test file of every engine. Adding an engine adds its entry here (ARCHITECTURE.md "Adding a language").
 */
export const TEST_FILES: Readonly<Record<EngineId, TestFileConventions>> = {
  typescript: { file: 'tests.md', listTestNames: (tests) => parseTypeScriptTests(tests).map((test) => test.name) },
  react: { file: 'tests.jsx', ...JAVASCRIPT_TESTS },
  vue: { file: 'tests.ts', ...JAVASCRIPT_TESTS },
  angular: { file: 'tests.ts', ...JAVASCRIPT_TESTS },
  node: { file: 'tests.ts', ...JAVASCRIPT_TESTS },
  python: {
    file: 'tests.py',
    listTestNames: listPythonTestNames,
    marker: { lineComment: '#', declaration: /^@test\(/ },
    blockComment: /"""[\s\S]*?"""|'''[\s\S]*?'''/g,
  },
  csharp: {
    file: 'tests.cs',
    listTestNames: listCsharpTestNames,
    marker: { lineComment: '//', declaration: /^\[(?:global::)?(?:Dojo\.)?Test(?:Attribute)?\s*\(/ },
    blockComment: /\/\*[\s\S]*?\*\//g,
  },
};

/** A marker line (`// beginner mistake: …`) and the line right below it. */
export interface MarkedTest {
  text: string;
  next: string;
  declaresTest: boolean;
}

/**
 * Every `<line comment> <label> <text>` line of a test file, with the line below it and whether that line declares a test.
 * Block comments are removed first; an engine without markers (the TypeScript DSL) has none.
 */
export function markedTests(tests: string, conventions: TestFileConventions, label = 'beginner mistake:'): MarkedTest[] {
  const { marker, blockComment } = conventions;
  if (!marker) {
    return [];
  }
  const lines = (blockComment ? tests.replace(blockComment, '') : tests).split('\n');
  const prefix = `${marker.lineComment} ${label}`;
  return lines.flatMap((line, index) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith(prefix)) {
      return [];
    }
    const next = (lines[index + 1] ?? '').trimStart();
    return [{ text: trimmed.slice(prefix.length).trim(), next, declaresTest: marker.declaration.test(next) }];
  });
}
