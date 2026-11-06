import { describe, expect, it } from 'vitest';
import { listTestNames } from './testNames';
import { runTests, type FrameworkAdapter } from './testRunner';

const plainAdapter: FrameworkAdapter = {
  registry: {},
  testFileName: 'tests.ts',
  compileFile: (_name, code) => code,
  createScope: () => ({}),
};

async function runtimeNames(tests: string): Promise<string[]> {
  const report = await runTests(plainAdapter, { files: { 'main.js': 'module.exports = {};' }, entry: 'main.js', tests });
  return report.results.map((result) => result.name);
}

const escapedQuotes = [String.raw`test('it\'s "fine"', () => {});`, String.raw`it("says \"hi\"", () => {});`, 'test(`back\\`tick`, () => {});'].join('\n');

describe('listTestNames', () => {
  it.each([
    ['escaped quotes', escapedQuotes, [`it's "fine"`, 'says "hi"', 'back`tick']],
    ['an escaped backslash', String.raw`test('C:\\temp\\', () => {}); it("a \\\"quoted\\\" word", () => {});`, ['C:\\temp\\', 'a \\"quoted\\" word']],
    ['a backslash followed by n', String.raw`test('with \\n', () => {});`, [String.raw`with \n`]],
  ])('lists names with %s as the runner reports them', async (_, tests, names) => {
    expect(listTestNames(tests)).toEqual(names);
    expect(await runtimeNames(tests)).toEqual(names);
  });
});
