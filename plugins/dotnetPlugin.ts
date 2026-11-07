import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';

const VENDOR_DIRECTORY = resolve(import.meta.dirname, '..', 'vendor', 'dotnet');
const MANIFEST = join(VENDOR_DIRECTORY, 'manifest.json');
const HOST_SOURCES = resolve(import.meta.dirname, '..', 'src', 'engines', 'csharp', 'host');
const VENDOR_HINT = 'run `npm install` or `npm run csharp:vendor` (it assembles the files pinned in vendor/dotnet/manifest.json)';

const CONTENT_TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.rtf': 'text/rtf',
};

export interface DotnetFile {
  path: string;
  role: 'runtime' | 'core' | 'assembly' | 'host' | 'reference' | 'license';
  sha256: string;
  bytes: number;
}

interface DotnetManifest {
  version?: string;
  files?: DotnetFile[];
  host?: { sources?: Record<string, string> };
}

function readManifest(): DotnetManifest {
  return existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as DotnetManifest) : {};
}

/**
 * The short hash of the served set, computed like `setVersion` in scripts/csharp-track/vendor-dotnet.mjs.
 */
function setVersion(files: DotnetFile[]): string {
  const hash = createHash('sha256');
  for (const file of [...files].sort((left, right) => left.path.localeCompare(right.path))) {
    hash.update(file.path).update('\0').update(file.sha256).update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

/**
 * Why the compiled host in the manifest no longer matches src/engines/csharp/host/*.cs, or undefined when it does.
 */
function staleHost(manifest: DotnetManifest): string | undefined {
  if (!existsSync(HOST_SOURCES)) {
    return undefined;
  }
  const current = Object.fromEntries(
    readdirSync(HOST_SOURCES)
      .filter((file) => file.endsWith('.cs'))
      .sort()
      .map((file) => [file, createHash('sha256').update(readFileSync(join(HOST_SOURCES, file))).digest('hex')]),
  );
  if (JSON.stringify(current) === JSON.stringify(manifest.host?.sources ?? {})) {
    return undefined;
  }
  return 'src/engines/csharp/host/*.cs changed since DojoHost.dll was compiled; run `npm run csharp:vendor` to rebuild it';
}

function contentType(path: string): string {
  return CONTENT_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Why a manifest file cannot be served (missing, or bytes that differ from its pinned sha256), or undefined when it can.
 */
function problem(file: DotnetFile, bytes: Buffer | undefined): string | undefined {
  if (!bytes) {
    return `Missing .NET file vendor/dotnet/${file.path}: ${VENDOR_HINT}.`;
  }
  if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) {
    return `vendor/dotnet/${file.path} does not match the sha256 in vendor/dotnet/manifest.json: ${VENDOR_HINT}.`;
  }
  return undefined;
}

function read(file: DotnetFile): Buffer | undefined {
  const path = join(VENDOR_DIRECTORY, file.path);
  return existsSync(path) ? readFileSync(path) : undefined;
}

/**
 * Serves the C# engine's files from `vendor/dotnet/` (the .NET WebAssembly runtime, the BCL and Roslyn assemblies and the compiled
 * host as Webcil `.wasm`, the reference assemblies wrapped in `.wasm`, and their licenses) at `<base>dotnet/<version>/` in dev and
 * copies them there unchanged in the build, plus `manifest.json`, so the C# worker loads a pinned runtime from the app's own origin.
 * Every booted file is `.js` or `.wasm`, which the host compresses with Brotli itself; no `.dll` is served. `<version>` is the manifest's hash of the served set, so
 * every path names fixed content and the host can cache `/dotnet/*` as immutable. Only files listed in the manifest are
 * served; the build fails when one is missing or altered, or when the host sources changed since the host was compiled (dev warns).
 * index.html carries `<meta name="dojo-dotnet">` with the version, for the same reason as `dojo-pyodide`.
 */
export function dotnetPlugin(): Plugin {
  const manifest = readManifest();
  const files = manifest.files ?? [];
  const version = manifest.version ?? '';
  const byPath = new Map(files.map((file) => [file.path, file]));
  let base = '/';
  let building = false;

  return {
    name: 'dojo-dotnet',
    configResolved(config) {
      base = config.base;
      building = config.command === 'build';
      const reasons = [
        files.length > 0 && version !== setVersion(files) ? `vendor/dotnet/manifest.json has no valid version: ${VENDOR_HINT}` : undefined,
        staleHost(manifest),
      ].filter((reason): reason is string => reason !== undefined);
      for (const reason of reasons) {
        if (building) {
          throw new Error(reason);
        }
        config.logger.warn(`dojo-dotnet: ${reason}`);
      }
    },
    transformIndexHtml() {
      if (files.length === 0) {
        return [];
      }
      return [{ tag: 'meta', attrs: { name: 'dojo-dotnet', content: version }, injectTo: 'head' }];
    },
    configureServer(server) {
      server.middlewares.use(`${base}dotnet/${version}`, (request, response, next) => {
        const path = (request.url ?? '').split('?')[0].replace(/^\//, '');
        if (path === 'manifest.json' && existsSync(MANIFEST)) {
          response.setHeader('Content-Type', CONTENT_TYPES['.json']);
          response.end(readFileSync(MANIFEST));
          return;
        }
        const file = byPath.get(path);
        if (!file) {
          next();
          return;
        }
        const bytes = read(file);
        const reason = problem(file, bytes);
        if (reason || !bytes) {
          server.config.logger.error(reason ?? `vendor/dotnet/${file.path} could not be read`);
          response.statusCode = 500;
          response.setHeader('Content-Type', 'text/plain; charset=utf-8');
          response.end(reason);
          return;
        }
        response.setHeader('Content-Type', contentType(path));
        response.end(bytes);
      });
    },
    generateBundle() {
      if (files.length === 0) {
        this.error(`vendor/dotnet/manifest.json is missing or lists no files: ${VENDOR_HINT}.`);
      }
      const problems: string[] = [];
      for (const file of files) {
        const bytes = read(file);
        const reason = problem(file, bytes);
        if (reason || !bytes) {
          problems.push(reason ?? file.path);
          continue;
        }
        this.emitFile({ type: 'asset', fileName: `dotnet/${version}/${file.path}`, source: bytes });
      }
      if (problems.length > 0) {
        this.error(problems.join('\n'));
      }
      this.emitFile({ type: 'asset', fileName: `dotnet/${version}/manifest.json`, source: readFileSync(MANIFEST) });
    },
  };
}
