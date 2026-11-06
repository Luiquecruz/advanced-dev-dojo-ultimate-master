import { describe, expect, it } from 'vitest';
import { markedTests, TEST_FILES } from './testFiles';

describe('TEST_FILES', () => {
  it('lists test names in source order for every test-file format', () => {
    expect(TEST_FILES.node.listTestNames("test('a', () => {});\ntest(\"b\", async () => {});")).toEqual(['a', 'b']);
    expect(TEST_FILES.python.listTestNames('@test("a")\ndef _():\n    pass\n\n@test(\'b\')\nasync def _():\n    pass')).toEqual(['a', 'b']);
    expect(TEST_FILES.csharp.listTestNames('[Test("a")]\npublic void A() {}\n[Test("b")]\npublic async Task B() {}')).toEqual(['a', 'b']);
    expect(TEST_FILES.typescript.listTestNames('## runtime: formats the total\n\n```ts\nexpect(1).toBe(1);\n```')).toEqual(['formats the total']);
  });

  it('names the test file of each engine', () => {
    expect(Object.fromEntries(Object.entries(TEST_FILES).map(([engine, { file }]) => [engine, file]))).toEqual({
      typescript: 'tests.md',
      react: 'tests.jsx',
      vue: 'tests.ts',
      angular: 'tests.ts',
      node: 'tests.ts',
      python: 'tests.py',
      csharp: 'tests.cs',
    });
  });
});

describe('markedTests', () => {
  it('finds the marker right above a test declaration in each language', () => {
    const node = "// beginner mistake: answers 200 for an error\ntest('a', () => {});";
    const python = '# beginner mistake: rounds half to even\n@test("a")\ndef _():\n    pass';
    const csharp = '    // beginner mistake: retries at once\n    [Test("a")]\n    public void A() {}';
    expect(markedTests(node, TEST_FILES.node)).toEqual([{ text: 'answers 200 for an error', next: "test('a', () => {});", declaresTest: true }]);
    expect(markedTests(python, TEST_FILES.python)).toEqual([{ text: 'rounds half to even', next: '@test("a")', declaresTest: true }]);
    expect(markedTests(csharp, TEST_FILES.csharp)).toEqual([{ text: 'retries at once', next: '[Test("a")]', declaresTest: true }]);
  });

  it('reports a marker that is not right above a test, and ignores markers in block comments and docstrings', () => {
    expect(markedTests("// beginner mistake: x\n\ntest('a', () => {});", TEST_FILES.node).map(({ declaresTest }) => declaresTest)).toEqual([false]);
    expect(markedTests("/*\n// beginner mistake: x\ntest('a', () => {});\n*/", TEST_FILES.node)).toEqual([]);
    expect(markedTests('"""\n# beginner mistake: x\n@test("a")\n"""', TEST_FILES.python)).toEqual([]);
    expect(markedTests('/* [Test("a")] */\n// beginner mistake: x\n[Dojo.Test("b")]', TEST_FILES.csharp).map(({ declaresTest }) => declaresTest)).toEqual([true]);
  });

  it('finds nothing in a format without markers', () => {
    expect(markedTests('## runtime: a\n<!-- beginner mistake: x -->', TEST_FILES.typescript)).toEqual([]);
  });
});
