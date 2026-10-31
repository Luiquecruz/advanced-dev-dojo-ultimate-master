import BufferModule from 'buffer/index.js';
import { transpile } from '../shared/compile';
import { errorMessage, sleep, type FrameworkAdapter } from '../shared/testRunner';
import { compileProject, evaluateProject, type ProjectFiles } from '../shared/project';
import * as Fs from './runtime/fs';
import { requestFetchHandler, requestServer, Server, type RequestInit, type TestResponse } from './runtime/http';
import { hasListeningServers, hasPendingWork, installNodeFetch, modulePrelude, resetNodeRuntime } from './runtime/index';
import { dirname, resolve } from './runtime/path';
import { process, ProcessExit } from './runtime/process';
import { format } from './runtime/util';
import { nodeRegistry } from './registry';
import { nodeAi } from './ai';

const { Buffer } = BufferModule;
const RUN_LIMIT_MS = 5000;
const RUN_POLL_MS = 25;
const SERVER_IDLE_MS = 1000;
const LEVELS = ['log', 'info', 'warn', 'error', 'debug'] as const;

type FetchHandler = (request: Request) => Response | Promise<Response>;
type RequestTarget = Server | FetchHandler | { fetch: FetchHandler } | ((request: any, response: any) => unknown);

/**
 * Compiles a learner file to CommonJS with Node globals bound to the runtime.
 */
export function compileNodeFile(name: string, code: string): string {
  if (name.endsWith('.json')) {
    return `module.exports = ${code};`;
  }
  const compiled = transpile(code, { fileName: name });
  const prelude = modulePrelude(name);
  return compiled.startsWith('"use strict";') ? `"use strict";${prelude}${compiled.slice('"use strict";'.length)}` : `${prelude}${compiled}`;
}

function request(target: RequestTarget, path: string, init?: RequestInit): Promise<TestResponse> {
  if (target instanceof Server) {
    return requestServer(target, path, init);
  }
  if (typeof target === 'object' && typeof target.fetch === 'function') {
    return requestFetchHandler((incoming) => target.fetch(incoming), path, init);
  }
  if (typeof target === 'function' && target.length >= 2) {
    return requestServer(target as (request: any, response: any) => unknown, path, init);
  }
  return requestFetchHandler(target as FetchHandler, path, init);
}

function writeFiles(files: Record<string, string | Uint8Array>): void {
  Object.entries(files).forEach(([path, content]) => {
    const target = resolve(path);
    Fs.mkdirSync(dirname(target), { recursive: true });
    Fs.writeFileSync(target, content);
  });
}

let restoreConsole: Array<() => void> = [];

function captureLogs(): string[] {
  const lines: string[] = [];
  LEVELS.forEach((level) => {
    const original = console[level];
    console[level] = (...args: unknown[]) => {
      lines.push(format(...args));
    };
    restoreConsole.push(() => (console[level] = original));
  });
  return lines;
}

function releaseConsole(): void {
  restoreConsole.forEach((restore) => restore());
  restoreConsole = [];
}

function cleanUp(): void {
  releaseConsole();
  process.stdout.flush();
  process.stderr.flush();
  resetNodeRuntime();
  nodeAi.reset();
}

export const nodeAdapter: FrameworkAdapter = {
  registry: nodeRegistry,
  testFileName: 'tests.ts',
  compileFile: compileNodeFile,
  createScope: () => ({
    request,
    captureLogs,
    writeFiles,
    fs: Fs,
    process,
    Buffer,
    fakeModel: nodeAi.testing.fakeModel,
    respond: nodeAi.testing.respond,
    forEachSeed: nodeAi.testing.forEachSeed,
  }),
  async beforeEach() {
    await sleep(0);
    installNodeFetch(globalThis);
    cleanUp();
  },
  afterEach() {
    cleanUp();
  },
};

/**
 * Runs the entry file like `node main.ts`: console output streams to the page and the run ends when the event loop is empty.
 */
export async function runNodeProgram(files: ProjectFiles, entry: string): Promise<void> {
  installNodeFetch(globalThis);
  resetNodeRuntime();
  nodeAi.reset();
  process.argv[1] = `/app/${entry}`;
  const startedAt = Date.now();
  try {
    evaluateProject(compileProject(files, compileNodeFile), entry, nodeRegistry);
    let onlyServersSince: number | undefined;
    do {
      await sleep(RUN_POLL_MS);
      const onlyServers = hasListeningServers() && !hasPendingWork({ ignoreServers: true });
      onlyServersSince = onlyServers ? (onlyServersSince ?? Date.now()) : undefined;
    } while (hasPendingWork() && Date.now() - startedAt < RUN_LIMIT_MS && (onlyServersSince === undefined || Date.now() - onlyServersSince < SERVER_IDLE_MS));
    if (hasListeningServers()) {
      console.info('The server is listening and idle, so the run stopped here. Requests reach it with fetch() inside the program, and tests call request(server, path).');
    } else if (hasPendingWork()) {
      console.info(`Program still busy after ${RUN_LIMIT_MS / 1000}s: stopped.`);
    }
  } catch (error) {
    if (!(error instanceof ProcessExit)) {
      console.error(errorMessage(error));
    }
  }
  process.stdout.flush();
  process.stderr.flush();
  console.info(`Process exited with code ${process.exitCode ?? 0}`);
  resetNodeRuntime();
}

export { format as formatNodeValue };
