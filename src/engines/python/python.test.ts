import { describe, expect, it } from 'vitest';
import { createFakeModelProvider } from '../shared/fakeModel';
import dojoAiSource from './runtime/dojo_ai/__init__.py?raw';
import dojoAiTestingSource from './runtime/dojo_ai/testing.py?raw';
import { listPythonTestNames } from './testNames';

const provider = createFakeModelProvider({ wait: async () => undefined });
const snakeCase = (name: string) => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

describe('listPythonTestNames', () => {
  it('reads @test names in order with either quote style and escaped quotes', () => {
    const tests = ['@test("returns the text")', 'async def _():', '    pass', '', "@test('handles \\'quoted\\' names')", 'def _():', '    pass', '# @test("commented out") is not a decorator line'].join('\n');
    expect(listPythonTestNames(tests)).toEqual(['returns the text', "handles 'quoted' names"]);
  });
});

describe('dojo_ai Python wrapper', () => {
  it('offers every model function under its Python name', () => {
    for (const name of Object.keys(provider.module)) {
      const pythonName = name === 'ModelError' ? 'class ModelError' : `def ${snakeCase(name)}(`;
      expect(dojoAiSource).toContain(pythonName);
    }
  });

  it('offers every respond builder and fake model method under its Python name', () => {
    for (const name of Object.keys(provider.testing.respond)) {
      expect(dojoAiTestingSource).toContain(`def ${snakeCase(name)}(`);
    }
    for (const name of Object.keys(provider.testing.fakeModel)) {
      expect(dojoAiTestingSource).toMatch(new RegExp(`def ${snakeCase(name)}\\(`));
    }
    expect(dojoAiTestingSource).toContain('async def for_each_seed(');
  });
});
