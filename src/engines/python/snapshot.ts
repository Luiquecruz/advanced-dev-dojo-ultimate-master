/**
 * Standard library modules imported before a Pyodide memory snapshot is taken, so interpreters booted from it start with them loaded.
 */
export const SNAPSHOT_MODULES = [
  'ast', 'asyncio', 'builtins', 'gc', 'importlib', 'inspect', 'json', 'logging', 'os', 'random', 'shutil', 'traceback', 'types', 'warnings',
  'abc', 'bisect', 'collections', 'contextlib', 'copy', 'dataclasses', 'datetime', 'decimal', 'enum', 'fractions', 'functools', 'heapq', 'io',
  'itertools', 'math', 'operator', 'pathlib', 're', 'statistics', 'string', 'tempfile', 'textwrap', 'typing', 'unicodedata', 'weakref',
] as const;

/**
 * The Python statement that imports every snapshot module.
 */
export function snapshotImports(): string {
  return `import ${SNAPSHOT_MODULES.join(', ')}`;
}
