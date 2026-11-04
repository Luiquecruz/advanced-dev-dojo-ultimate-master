import type { PyodideAPI } from 'pyodide';
import type { ProjectFiles } from '../shared/project';

/**
 * Pyodide packages lessons may import, by top-level module name. Each is vendored with its dependencies under
 * `vendor/pyodide-packages/` (`npm run python:vendor`), verified against the sha256 in `pyodide-lock.json` and served from the app's origin.
 */
export const LESSON_PACKAGES: Readonly<Record<string, string>> = {
  pydantic: 'pydantic',
  pydantic_core: 'pydantic',
  annotated_types: 'pydantic',
  typing_inspection: 'pydantic',
};

const IMPORT = /^[ \t]*(?:from[ \t]+([A-Za-z_]\w*)[\w.]*[ \t]+import\b|import[ \t]+([^\n#]+))/gm;

/**
 * The vendored packages a project needs, read from the `import` statements of its Python files and its tests, sorted.
 */
export function requiredPackages(files: ProjectFiles, tests = ''): string[] {
  const packages = new Set<string>();
  for (const source of [tests, ...Object.entries(files).filter(([name]) => name.endsWith('.py')).map(([, code]) => code)]) {
    for (const match of source.matchAll(IMPORT)) {
      const modules = match[1] ? [match[1]] : match[2].split(',').map((part) => part.trim().split(/[\s.]/)[0]);
      for (const module of modules) {
        const name = LESSON_PACKAGES[module];
        if (name) {
          packages.add(name);
        }
      }
    }
  }
  return [...packages].sort();
}

/**
 * Loads vendored packages by name with integrity checks and throws when any of them did not load (a failed check, a missing
 * wheel), so the boot fails with the reason instead of the lesson seeing `ModuleNotFoundError`.
 */
export async function loadLessonPackages(pyodide: PyodideAPI, packages: string[]): Promise<void> {
  if (packages.length === 0) {
    return;
  }
  const errors: string[] = [];
  await pyodide.loadPackage(packages, { checkIntegrity: true, messageCallback: () => undefined, errorCallback: (message) => errors.push(message) });
  const missing = packages.filter((name) => !(name in pyodide.loadedPackages));
  if (errors.length > 0 || missing.length > 0) {
    throw new Error(`Could not load the vendored package${packages.length > 1 ? 's' : ''} ${packages.join(', ')}${missing.length > 0 ? ` (not loaded: ${missing.join(', ')})` : ''}${errors.length > 0 ? `: ${errors.join('; ')}` : ''}`);
  }
}
