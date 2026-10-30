export type ProjectFiles = Record<string, string>;
export type CompiledProject = Record<string, string>;
export type ModuleRegistry = Record<string, unknown>;

export interface EvaluatedProject {
  entry: Record<string, any>;
  modules: Record<string, Record<string, any>>;
  require: (name: string) => unknown;
}

const EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '.vue'];
const INDEX_FILES = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

/**
 * Marks an ES module namespace so CommonJS interop keeps named and default exports intact.
 */
export function esModule(namespace: object): Record<string, unknown> {
  return { __esModule: true, ...namespace };
}

function directoryOf(fileName: string): string {
  return fileName.includes('/') ? fileName.slice(0, fileName.lastIndexOf('/')) : '';
}

function joinPath(directory: string, specifier: string): string {
  const segments = specifier.startsWith('/') ? [] : directory.split('/').filter(Boolean);
  for (const segment of specifier.split('/')) {
    if (segment === '..') {
      segments.pop();
    } else if (segment && segment !== '.') {
      segments.push(segment);
    }
  }
  return segments.join('/');
}

/**
 * Resolves a relative or root-absolute import to a project file name, trying extensions and folder index files.
 */
export function resolveFile(compiled: CompiledProject, specifier: string, directory = ''): string | undefined {
  const base = joinPath(directory, specifier);
  return [...EXTENSIONS, ...INDEX_FILES].map((suffix) => `${base}${suffix}`).find((candidate) => candidate in compiled);
}

/**
 * Compiles every file of a learner project.
 */
export function compileProject(files: ProjectFiles, compileFile: (name: string, code: string) => string): CompiledProject {
  return Object.fromEntries(Object.entries(files).map(([name, code]) => [name, compileFile(name, code)]));
}

/**
 * Evaluates compiled files with a CommonJS loader that resolves relative imports between project files.
 */
export function evaluateProject(compiled: CompiledProject, entryName: string, registry: ModuleRegistry): EvaluatedProject {
  const cache: Record<string, { exports: Record<string, any> }> = {};

  const requireFrom = (directory: string) => (specifier: string): unknown => {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const fileName = resolveFile(compiled, specifier, directory);
      if (!fileName) {
        throw new Error(`Cannot find file "${specifier}". Project files: ${Object.keys(compiled).join(', ')}`);
      }
      return load(fileName);
    }
    if (/\.(css|scss)$/.test(specifier)) {
      return {};
    }
    if (!(specifier in registry)) {
      throw new Error(`Module "${specifier}" is not available here. Available: ${Object.keys(registry).filter((name) => !name.startsWith('__')).join(', ')}`);
    }
    return registry[specifier];
  };

  const load = (fileName: string): Record<string, any> => {
    if (cache[fileName]) {
      return cache[fileName].exports;
    }
    const module = { exports: {} as Record<string, any> };
    cache[fileName] = module;
    const factory = new Function('require', 'module', 'exports', compiled[fileName]);
    factory(requireFrom(directoryOf(fileName)), module, module.exports);
    return module.exports;
  };

  const entry = load(entryName);
  const modules = Object.fromEntries(Object.keys(compiled).map((name) => [name, load(name)]));
  return { entry, modules, require: requireFrom('') };
}
