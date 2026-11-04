import { createHash } from 'node:crypto';
import type { ToolDefinition } from '@dojo/ai';

export interface McpTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}

export interface ServerEntry {
  id: string;
  url: string;
}

export type FindingRule = 'hidden_tag' | 'invisible_characters' | 'instruction' | 'sensitive_path' | 'shadowing';

export interface Finding {
  rule: FindingRule;
  location: string;
  excerpt: string;
}

export type PendingTool =
  | { name: string; reason: 'poisoned'; findings: Finding[] }
  | { name: string; reason: 'new'; hash: string }
  | { name: string; reason: 'changed'; hash: string; pinnedHash: string };

export type Review =
  | { status: 'blocked'; reason: 'server_not_allowlisted' | 'url_mismatch'; approved: ToolDefinition[]; pending: PendingTool[] }
  | { status: 'reviewed'; approved: ToolDefinition[]; pending: PendingTool[] };

export class ToolPoisoningError extends Error {
  readonly findings: Finding[];

  constructor(message: string, findings: Finding[]) {
    super(message);
    this.name = 'ToolPoisoningError';
    this.findings = findings;
  }
}

export const INSTRUCTION_PATTERNS: RegExp[] = [
  /ignore (?:all |any )?(?:previous|prior|above|other) (?:instructions|rules)/i,
  /do not (?:tell|mention|inform|alert) the user/i,
  /(?:before|after|when) (?:using|calling) this tool/i,
  /you (?:must|should) (?:first |also |always )?(?:read|call|send|include|pass|forward)/i,
  /without (?:asking|telling|confirmation|approval)/i,
];

const HIDDEN_TAG = /<\s*\/?\s*(?:important|system|instructions?|secret|admin)\b[^>]*>|<!--[\s\S]*?-->/i;
const INVISIBLE = /[​-‏‪-‮⁠-⁤⁦-⁩﻿\u{E0000}-\u{E007F}]/u;
const SENSITIVE_PATH = /~\/\.ssh|id_rsa|\.env\b|mcp\.json|\.aws\/credentials|\/etc\/passwd/i;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function textsOf(tool: McpTool): Array<{ location: string; text: string }> {
  const texts = [{ location: 'description', text: tool.description ?? '' }];
  const properties = (tool.inputSchema.properties ?? {}) as Record<string, { description?: unknown }>;
  for (const [name, property] of Object.entries(properties)) {
    if (typeof property?.description === 'string') {
      texts.push({ location: `parameter:${name}`, text: property.description });
    }
  }
  return texts;
}

export function scanTool(tool: McpTool, { knownToolNames = [] }: { knownToolNames?: string[] } = {}): Finding[] {
  const otherTools = knownToolNames.filter((name) => name !== tool.name);
  const findings: Finding[] = [];
  for (const { location, text } of textsOf(tool)) {
    const tag = text.match(HIDDEN_TAG);
    if (tag) {
      findings.push({ rule: 'hidden_tag', location, excerpt: tag[0] });
    }
    const invisible = text.match(INVISIBLE);
    if (invisible) {
      findings.push({ rule: 'invisible_characters', location, excerpt: `U+${invisible[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}` });
    }
    const instruction = INSTRUCTION_PATTERNS.map((pattern) => text.match(pattern)).find((match) => match !== null);
    if (instruction) {
      findings.push({ rule: 'instruction', location, excerpt: instruction[0] });
    }
    const path = text.match(SENSITIVE_PATH);
    if (path) {
      findings.push({ rule: 'sensitive_path', location, excerpt: path[0] });
    }
    const shadowed = otherTools.find((name) => new RegExp(`(?<![\\w-])${escapeRegExp(name)}(?![\\w-])`).test(text));
    if (shadowed) {
      findings.push({ rule: 'shadowing', location, excerpt: shadowed });
    }
  }
  return findings;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

export function fingerprintTool(tool: McpTool): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(tool))).digest('hex');
}

function sameUrl(left: string, right: string): boolean {
  try {
    return new URL(left).href === new URL(right).href;
  } catch {
    return false;
  }
}

export function createToolGate({ allowedServers, pins = {}, knownToolNames = [] }: { allowedServers: ServerEntry[]; pins?: Record<string, string>; knownToolNames?: string[] }) {
  const pinned: Record<string, string> = { ...pins };
  const seenNames = new Set(knownToolNames);
  return {
    review(server: ServerEntry, tools: McpTool[]): Review {
      const entry = allowedServers.find((allowed) => allowed.id === server.id);
      if (!entry) {
        return { status: 'blocked', reason: 'server_not_allowlisted', approved: [], pending: [] };
      }
      if (!sameUrl(entry.url, server.url)) {
        return { status: 'blocked', reason: 'url_mismatch', approved: [], pending: [] };
      }
      tools.forEach((tool) => seenNames.add(tool.name));
      const approved: ToolDefinition[] = [];
      const pending: PendingTool[] = [];
      for (const tool of tools) {
        const name = `${server.id}__${tool.name}`;
        const findings = scanTool(tool, { knownToolNames: [...seenNames] });
        const hash = fingerprintTool(tool);
        if (findings.length > 0) {
          pending.push({ name, reason: 'poisoned', findings });
        } else if (pinned[name] === undefined) {
          pending.push({ name, reason: 'new', hash });
        } else if (pinned[name] !== hash) {
          pending.push({ name, reason: 'changed', hash, pinnedHash: pinned[name] });
        } else {
          approved.push({ name, description: tool.description ?? '', parameters: tool.inputSchema });
        }
      }
      return { status: 'reviewed', approved, pending };
    },
    approve(serverId: string, tool: McpTool): string {
      const findings = scanTool(tool, { knownToolNames: [...seenNames] });
      if (findings.length > 0) {
        throw new ToolPoisoningError(`Tool ${serverId}__${tool.name} has ${findings.length} suspicious finding(s)`, findings);
      }
      const hash = fingerprintTool(tool);
      pinned[`${serverId}__${tool.name}`] = hash;
      return hash;
    },
    pins(): Record<string, string> {
      return { ...pinned };
    },
  };
}
