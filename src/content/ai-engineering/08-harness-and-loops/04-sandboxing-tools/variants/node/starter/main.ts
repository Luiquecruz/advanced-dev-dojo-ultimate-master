import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
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

// TODO: reject empty paths and NUL bytes, resolve against the root, refuse anything that is not the root or under root + '/'
export function createJail(root: string): Jail {
  const absoluteRoot = resolve(root);
  const resolveInside = (path: string): string => resolve(absoluteRoot, path);
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
      return readdir(resolveInside(path));
    },
  };
}

// TODO: parse, then check scheme, credentials, port, IP literals, localhost and the allowlist, in that order
export function checkEgress(url: string, policy: EgressPolicy): EgressDecision {
  const host = new URL(url).hostname;
  const allowed = policy.allowedHosts.some((entry) => host.endsWith(entry.replace('*.', '')));
  return allowed ? { allowed: true, host } : { allowed: false, reason: 'not_allowlisted' };
}

// TODO: check every URL before fetching it, follow redirects manually and check each hop, stop after maxRedirects
export function createFetchTool({ fetch, policy, maxRedirects = 3 }: FetchToolOptions): (url: string) => Promise<FetchResult> {
  return async (url) => {
    const response = await fetch(url, { redirect: 'manual' });
    return { status: response.status, url, body: await response.text() };
  };
}

// TODO: dispatch read_file, write_file, list_files and fetch_url; turn every failure into a tool message starting with "Error:"
export async function executeToolCall(toolCall: ToolCall, { jail, fetchUrl }: { jail: Jail; fetchUrl: (url: string) => Promise<FetchResult> }): Promise<Message> {
  const args = JSON.parse(toolCall.arguments);
  if (toolCall.name === 'read_file') {
    return { role: 'tool', toolCallId: toolCall.id, content: await jail.readFile(args.path) };
  }
  if (toolCall.name === 'write_file') {
    await jail.writeFile(args.path, args.content);
    return { role: 'tool', toolCallId: toolCall.id, content: `Wrote ${args.path}` };
  }
  if (toolCall.name === 'list_files') {
    return { role: 'tool', toolCallId: toolCall.id, content: (await jail.list(args.path)).join('\n') };
  }
  return { role: 'tool', toolCallId: toolCall.id, content: (await fetchUrl(args.url)).body };
}
