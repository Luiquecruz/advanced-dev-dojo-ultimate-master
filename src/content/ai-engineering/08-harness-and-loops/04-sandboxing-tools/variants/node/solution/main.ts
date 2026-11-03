import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, normalize, resolve } from 'node:path';
import type { Message, ToolCall } from '@dojo/ai';

export type SandboxErrorCode = 'invalid_path' | 'path_escape' | 'egress_denied';

export class SandboxError extends Error {
  readonly code: SandboxErrorCode;

  constructor(code: SandboxErrorCode, message: string) {
    super(message);
    this.name = 'SandboxError';
    this.code = code;
  }
}

export interface Jail {
  root: string;
  resolve(path: string): string;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  list(path?: string): Promise<string[]>;
}

export interface EgressPolicy {
  allowedHosts: string[];
  allowedSchemes?: string[];
}

export type EgressDecision = { allowed: true; host: string } | { allowed: false; reason: string };

export interface FetchResponseLike {
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export type FetchLike = (url: string, init: { redirect: 'manual' }) => Promise<FetchResponseLike>;

export interface FetchToolOptions {
  fetch: FetchLike;
  policy: EgressPolicy;
  maxRedirects?: number;
}

export interface FetchResult {
  status: number;
  url: string;
  body: string;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const IPV4_ADDRESS = /^\d{1,3}(\.\d{1,3}){3}$/;

export function createJail(root: string): Jail {
  const absoluteRoot = resolve(root);
  const resolveInside = (path: string): string => {
    if (path === '' || path.includes('\0')) {
      throw new SandboxError('invalid_path', `"${path}" is not a valid path`);
    }
    const target = path.startsWith('/') ? normalize(path) : resolve(absoluteRoot, path);
    const withoutTrailingSlash = target.length > 1 && target.endsWith('/') ? target.slice(0, -1) : target;
    if (withoutTrailingSlash !== absoluteRoot && !withoutTrailingSlash.startsWith(`${absoluteRoot}/`)) {
      throw new SandboxError('path_escape', `${path} is outside the workspace ${absoluteRoot}`);
    }
    return withoutTrailingSlash;
  };
  return {
    root: absoluteRoot,
    resolve: resolveInside,
    async readFile(path) {
      return readFile(resolveInside(path), 'utf8');
    },
    async writeFile(path, content) {
      const target = resolveInside(path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content);
    },
    async list(path = '.') {
      return (await readdir(resolveInside(path))).sort();
    },
  };
}

function hostAllowed(host: string, allowedHosts: string[]): boolean {
  return allowedHosts.some((entry) => {
    const normalizedEntry = entry.toLowerCase();
    return normalizedEntry.startsWith('*.') ? host.endsWith(normalizedEntry.slice(1)) : host === normalizedEntry;
  });
}

export function checkEgress(url: string, policy: EgressPolicy): EgressDecision {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: 'invalid_url' };
  }
  if (!(policy.allowedSchemes ?? ['https:']).includes(parsed.protocol)) {
    return { allowed: false, reason: 'scheme' };
  }
  if (parsed.username !== '' || parsed.password !== '') {
    return { allowed: false, reason: 'credentials' };
  }
  if (parsed.port !== '') {
    return { allowed: false, reason: 'port' };
  }
  if (IPV4_ADDRESS.test(parsed.hostname) || parsed.hostname.startsWith('[')) {
    return { allowed: false, reason: 'ip_literal' };
  }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return { allowed: false, reason: 'local_host' };
  }
  if (!hostAllowed(host, policy.allowedHosts)) {
    return { allowed: false, reason: 'not_allowlisted' };
  }
  return { allowed: true, host };
}

export function createFetchTool({ fetch, policy, maxRedirects = 3 }: FetchToolOptions): (url: string) => Promise<FetchResult> {
  const ensureAllowed = (url: string) => {
    const decision = checkEgress(url, policy);
    if (!decision.allowed) {
      throw new SandboxError('egress_denied', `${url} is not allowed: ${decision.reason}`);
    }
  };
  return async (url) => {
    let current = url;
    for (let redirects = 0; ; redirects++) {
      ensureAllowed(current);
      const response = await fetch(current, { redirect: 'manual' });
      const location = response.headers.get('location');
      if (!REDIRECT_STATUSES.has(response.status) || location === null) {
        return { status: response.status, url: current, body: await response.text() };
      }
      if (redirects >= maxRedirects) {
        throw new SandboxError('egress_denied', `${url} redirected more than ${maxRedirects} times`);
      }
      current = new URL(location, current).toString();
    }
  };
}

async function runTool(name: string, args: Record<string, unknown>, jail: Jail, fetchUrl: (url: string) => Promise<FetchResult>): Promise<string> {
  switch (name) {
    case 'read_file':
      return jail.readFile(String(args.path));
    case 'write_file':
      await jail.writeFile(String(args.path), String(args.content));
      return `Wrote ${args.path}`;
    case 'list_files':
      return (await jail.list(args.path === undefined ? '.' : String(args.path))).join('\n');
    case 'fetch_url':
      return (await fetchUrl(String(args.url))).body;
    default:
      throw new Error(`unknown tool ${name}`);
  }
}

export async function executeToolCall(toolCall: ToolCall, { jail, fetchUrl }: { jail: Jail; fetchUrl: (url: string) => Promise<FetchResult> }): Promise<Message> {
  try {
    const args = JSON.parse(toolCall.arguments);
    return { role: 'tool', toolCallId: toolCall.id, content: await runTool(toolCall.name, args, jail, fetchUrl) };
  } catch (error) {
    const message = error instanceof SandboxError ? `${error.code}: ${error.message}` : (error as Error).message;
    return { role: 'tool', toolCallId: toolCall.id, content: `Error: ${message}` };
  }
}
