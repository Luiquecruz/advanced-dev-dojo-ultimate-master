import { normalize } from 'node:path';
import type { GenerateResponse } from '@dojo/ai';

export type Decision = 'allow' | 'ask' | 'deny';

export interface Policy {
  allow: string[];
  ask: string[];
  deny: string[];
}

export interface ToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface PolicyResult {
  decision: Decision;
  rule: string | null;
}

export interface ReviewedToolCall extends PolicyResult {
  toolCallId: string;
  name: string;
}

export const PRIMARY_ARGUMENT: Record<string, string> = { Bash: 'command', Read: 'path', Edit: 'path', Write: 'path', Fetch: 'url' };

const PATH_TOOLS = new Set(['Read', 'Edit', 'Write']);

// TODO: match the whole command; `*` matches anything, every other character is literal; trim and collapse whitespace first
export function matchesCommand(pattern: string, command: string): boolean {
  return command.startsWith(pattern.replace(/\*/g, ''));
}

// TODO: normalize the path, reject paths outside the project, then glob-match with `**`, `**/`, `*` and `?`
export function matchesPath(pattern: string, path: string): boolean {
  return path.startsWith(pattern.replace(/\*/g, ''));
}

// TODO: split on &&, ||, ;, | and newlines; return trimmed, non-empty parts
export function splitCommand(command: string): string[] {
  return [command];
}

function parseRule(rule: string): { tool: string; pattern?: string } {
  const open = rule.indexOf('(');
  if (open === -1 || !rule.endsWith(')')) {
    return { tool: rule.trim() };
  }
  return { tool: rule.slice(0, open).trim(), pattern: rule.slice(open + 1, -1) };
}

// TODO: deny, then ask, then allow (first match wins, default ask); tool-name globs; paths outside the project; one result per Bash part, strictest wins
export function evaluate(policy: Policy, call: ToolCallRequest): PolicyResult {
  for (const decision of ['allow', 'ask', 'deny'] as const) {
    for (const rule of policy[decision]) {
      const { tool, pattern } = parseRule(rule);
      const value = String(call.arguments[PRIMARY_ARGUMENT[call.name] ?? ''] ?? '');
      const matches = PATH_TOOLS.has(call.name) ? matchesPath(pattern ?? '', normalize(value)) : matchesCommand(pattern ?? '', value);
      if (tool === call.name && matches) {
        return { decision, rule };
      }
    }
  }
  return { decision: 'ask', rule: null };
}

// TODO: deny unknown tools and arguments that are not a JSON object; evaluate the rest
export function reviewToolCalls(response: GenerateResponse, policy: Policy, knownTools: string[]): ReviewedToolCall[] {
  return response.toolCalls.map((toolCall) => ({
    toolCallId: toolCall.id,
    name: toolCall.name,
    ...evaluate(policy, { name: toolCall.name, arguments: JSON.parse(toolCall.arguments) }),
  }));
}
