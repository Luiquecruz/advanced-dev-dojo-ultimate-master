import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LESSON_PACKAGES } from '../engines/python/packages';
import { VENDORED_PACKAGES_DIRECTORY } from './pythonSandbox';

interface LockEntry {
  version: string;
  file_name: string;
  sha256: string;
  depends: string[];
}

const pyodideDirectory = dirname(createRequire(import.meta.url).resolve('pyodide/package.json'));
const lock = JSON.parse(readFileSync(join(pyodideDirectory, 'pyodide-lock.json'), 'utf8')) as { packages: Record<string, LockEntry> };
const manifest = JSON.parse(readFileSync(join(VENDORED_PACKAGES_DIRECTORY, 'manifest.json'), 'utf8')) as {
  pyodide: string;
  packages: { name: string; version: string; file: string; sha256: string }[];
};

function closure(name: string, names = new Set<string>()): Set<string> {
  const key = name.toLowerCase().replace(/_/g, '-');
  if (!names.has(key)) {
    names.add(key);
    lock.packages[key].depends.forEach((dependency) => closure(dependency, names));
  }
  return names;
}

describe('vendored Pyodide packages', () => {
  it('match the pinned Pyodide version', () => {
    expect(manifest.pyodide).toBe(JSON.parse(readFileSync(join(pyodideDirectory, 'package.json'), 'utf8')).version);
  });

  it('cover every lesson package and its dependencies, and nothing else', () => {
    const expected = new Set(Object.values(LESSON_PACKAGES).flatMap((name) => [...closure(name)]));
    expect(new Set(manifest.packages.map((entry) => entry.name))).toEqual(expected);
  });

  it.each(manifest.packages.map((entry) => [entry.file, entry] as const))('%s matches the sha256 in pyodide-lock.json', (_, entry) => {
    const locked = lock.packages[entry.name];
    expect(entry.file).toBe(locked.file_name);
    expect(entry.sha256).toBe(locked.sha256);
    expect(createHash('sha256').update(readFileSync(join(VENDORED_PACKAGES_DIRECTORY, entry.file))).digest('hex')).toBe(locked.sha256);
  });

  it.each([...manifest.packages.map((entry) => entry.name), 'pyodide'])('ships the license of %s', (name) => {
    expect(existsSync(join(VENDORED_PACKAGES_DIRECTORY, 'licenses', `${name}-LICENSE`))).toBe(true);
  });
});
