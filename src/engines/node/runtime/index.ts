import { resetFileSystem } from './fs';
import { closeAllServers, fetchFromServer, hasListeningServers, serverOnPort } from './http';
import { process } from './process';
import { clearAllTimers, hasPendingTimers } from './timers';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);
const INSTALLED = Symbol.for('dev-dojo.node.fetch');

let pendingFetches = 0;

/**
 * Routes fetch() calls to http://localhost:<port> into the in-memory servers.
 */
export function installNodeFetch(target: typeof globalThis): void {
  if ((target.fetch as any)?.[INSTALLED]) {
    return;
  }
  const previous = target.fetch.bind(target);
  const nodeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    pendingFetches++;
    try {
      const raw = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
      const url = /^https?:\/\//i.test(raw) ? new URL(raw) : undefined;
      const local = url !== undefined && LOCAL_HOSTS.has(url.hostname) && url.port !== '';
      const server = local ? serverOnPort(Number(url.port)) : undefined;
      if (server) {
        return await fetchFromServer(server, new Request(input instanceof Request ? input : url!, init));
      }
      if (local) {
        throw new TypeError('fetch failed', { cause: Object.assign(new Error(`connect ECONNREFUSED 127.0.0.1:${url!.port}`), { code: 'ECONNREFUSED' }) });
      }
      return await previous(input, init);
    } finally {
      pendingFetches--;
    }
  };
  target.fetch = Object.assign(nodeFetch, { [INSTALLED]: true });
}

/**
 * Restores the runtime to a clean state: files, env, process listeners, timers and servers.
 */
export function resetNodeRuntime(): void {
  clearAllTimers();
  closeAllServers();
  resetFileSystem();
  process.reset();
}

/**
 * Whether the program still has work keeping the event loop alive.
 */
export function hasPendingWork({ ignoreServers = false } = {}): boolean {
  return hasPendingTimers() || (!ignoreServers && hasListeningServers()) || pendingFetches > 0;
}

export { hasListeningServers };

/**
 * Source prepended to every learner module so Node globals resolve to the runtime.
 */
export function modulePrelude(fileName: string): string {
  return [
    'var process = require("node:process");',
    'var Buffer = require("node:buffer").Buffer;',
    'var __timers = require("node:timers");',
    'var setTimeout = __timers.setTimeout, clearTimeout = __timers.clearTimeout, setInterval = __timers.setInterval, clearInterval = __timers.clearInterval, setImmediate = __timers.setImmediate, clearImmediate = __timers.clearImmediate;',
    'var global = globalThis;',
    `var __filename = ${JSON.stringify(`/app/${fileName}`)}, __dirname = "/app";`,
  ].join(' ');
}
