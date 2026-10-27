// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = import.meta.dirname;
const LAYERS = ['shared', 'entities', 'features', 'pages', 'app'] as const;
const DOMAIN = ['content', 'engines', 'sandbox', 'verify'];
const BARREL_LAYERS = ['entities', 'features'];
const IMPORT = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

type Layer = (typeof LAYERS)[number];

interface ImportEdge {
  file: string;
  specifier: string;
  target: string;
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return name === 'content' && directory === SRC ? [] : listSourceFiles(path);
    }
    return /\.tsx?$/.test(name) && !name.endsWith('.test.ts') ? [relative(SRC, path)] : [];
  });
}

function importsOf(file: string): ImportEdge[] {
  const source = readFileSync(join(SRC, file), 'utf8');
  return [...source.matchAll(IMPORT)]
    .map(([, specifier]) => {
      if (specifier.startsWith('@/')) {
        return { file, specifier, target: specifier.slice(2) };
      }
      if (specifier.startsWith('.')) {
        return { file, specifier, target: relative(SRC, resolve(SRC, dirname(file), specifier.split('?')[0])) };
      }
      return undefined;
    })
    .filter((edge): edge is ImportEdge => edge !== undefined);
}

function layerOf(path: string): Layer | undefined {
  return LAYERS.find((layer) => path === layer || path.startsWith(`${layer}/`));
}

function sliceOf(path: string): string {
  const [first, second] = path.split('/');
  return first === 'app' || !layerOf(path) ? first : `${first}/${second}`;
}

const edges = listSourceFiles(SRC).flatMap(importsOf);
const layered = edges.filter((edge) => layerOf(edge.file));

describe('architecture', () => {
  it('imports only from lower layers or from the same slice', () => {
    const violations = layered.filter((edge) => {
      const from = layerOf(edge.file)!;
      const to = layerOf(edge.target);
      if (!to || sliceOf(edge.file) === sliceOf(edge.target) || (from === 'shared' && to === 'shared')) {
        return false;
      }
      return LAYERS.indexOf(to) >= LAYERS.indexOf(from);
    });
    expect(violations.map((edge) => `${edge.file} -> ${edge.specifier}`)).toEqual([]);
  });

  it('reaches other entity and feature slices only through their public index', () => {
    const violations = layered.filter((edge) => {
      const to = layerOf(edge.target);
      return to && BARREL_LAYERS.includes(to) && sliceOf(edge.file) !== sliceOf(edge.target) && edge.specifier !== `@/${sliceOf(edge.target)}`;
    });
    expect(violations.map((edge) => `${edge.file} -> ${edge.specifier}`)).toEqual([]);
  });

  it('keeps relative imports inside their own slice', () => {
    const violations = layered.filter((edge) => edge.specifier.startsWith('.') && sliceOf(edge.file) !== sliceOf(edge.target));
    expect(violations.map((edge) => `${edge.file} -> ${edge.specifier}`)).toEqual([]);
  });

  it('keeps shared free of the course domain', () => {
    const violations = layered.filter((edge) => layerOf(edge.file) === 'shared' && DOMAIN.includes(sliceOf(edge.target)));
    expect(violations.map((edge) => `${edge.file} -> ${edge.specifier}`)).toEqual([]);
  });

  it('keeps the course domain and engines independent of the UI layers', () => {
    const violations = edges.filter((edge) => DOMAIN.includes(sliceOf(edge.file)) && layerOf(edge.target));
    expect(violations.map((edge) => `${edge.file} -> ${edge.specifier}`)).toEqual([]);
  });
});
