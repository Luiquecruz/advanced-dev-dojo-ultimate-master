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

export function scanTool(tool: McpTool, { knownToolNames = [] }: { knownToolNames?: string[] } = {}): Finding[] {
  // TODO: scan the description and every parameter description for hidden tags, invisible characters, INSTRUCTION_PATTERNS, sensitive paths and other tools' names
  const findings: Finding[] = [];
  if (tool.description?.includes('<IMPORTANT>')) {
    findings.push({ rule: 'hidden_tag', location: 'description', excerpt: '<IMPORTANT>' });
  }
  return findings;
}

export function fingerprintTool(tool: McpTool): string {
  // TODO: hash canonical JSON (object keys sorted at every depth) so key order does not change the fingerprint
  return createHash('sha256').update(JSON.stringify(tool)).digest('hex');
}

export function createToolGate({ allowedServers, pins = {}, knownToolNames = [] }: { allowedServers: ServerEntry[]; pins?: Record<string, string>; knownToolNames?: string[] }) {
  const pinned: Record<string, string> = { ...pins };
  return {
    review(server: ServerEntry, tools: McpTool[]): Review {
      // TODO: block unknown servers and URL mismatches; withhold poisoned, new and changed tools
      return {
        status: 'reviewed',
        approved: tools.map((tool) => ({ name: `${server.id}__${tool.name}`, description: tool.description ?? '', parameters: tool.inputSchema })),
        pending: [],
      };
    },
    approve(serverId: string, tool: McpTool): string {
      // TODO: refuse poisoned tools with a ToolPoisoningError
      const hash = fingerprintTool(tool);
      pinned[`${serverId}__${tool.name}`] = hash;
      return hash;
    },
    pins(): Record<string, string> {
      return { ...pinned };
    },
  };
}
