export type ProjectFiles = Record<string, string>;
export type CompiledProject = Record<string, string>;
export type ModuleRegistry = Record<string, unknown>;

export interface EvaluatedProject {
  entry: Record<string, any>;
  modules: Record<string, Record<string, any>>;
  require: (name: string) => unknown;
}

const EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '.vue'];

/**
 * Marks an ES module namespace so CommonJS interop keeps named and default exports intact.
 */
export function esModule(namespace: object): Record<string, unknown> {
  return { __esModule: true, ...namespace };
}

function normalize(specifier: string): string {
  return specifier.replace(/^\.\//, '').replace(/^\//, '');
}

function resolveFile(compiled: CompiledProject, specifier: string): string | undefined {
  const base = normalize(specifier);
  return EXTENSIONS.map((extension) => `${base}${extension}`).find((candidate) => candidate in compiled);
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

  const requireModule = (specifier: string): unknown => {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const fileName = resolveFile(compiled, specifier);
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
    factory(requireModule, module, module.exports);
    return module.exports;
  };

  const entry = load(entryName);
  const modules = Object.fromEntries(Object.keys(compiled).map((name) => [name, load(name)]));
  return { entry, modules, require: requireModule };
}
