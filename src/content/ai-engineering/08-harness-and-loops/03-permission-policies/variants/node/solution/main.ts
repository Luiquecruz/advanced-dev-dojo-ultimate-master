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
const EVALUATION_ORDER: Decision[] = ['deny', 'ask', 'allow'];
const SEVERITY: Record<Decision, number> = { allow: 0, ask: 1, deny: 2 };

const escapeLiteral = (text: string) => text.replace(/[.+^${}()|[\]\\?*]/g, '\\$&');

function wildcardToRegExp(pattern: string): RegExp {
  return new RegExp(`^${pattern.split('*').map(escapeLiteral).join('.*')}$`, 's');
}

function globToRegExp(pattern: string): RegExp {
  let source = '';
  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index];
    if (character === '*' && pattern[index + 1] === '*') {
      const followedBySlash = pattern[index + 2] === '/';
      source += followedBySlash ? '(?:.*/)?' : '.*';
      index += followedBySlash ? 2 : 1;
    } else if (character === '*') {
      source += '[^/]*';
    } else if (character === '?') {
      source += '[^/]';
    } else {
      source += escapeLiteral(character);
    }
  }
  return new RegExp(`^${source}$`);
}

function isOutsideProject(path: string): boolean {
  const normalized = normalize(path);
  return normalized.startsWith('/') || normalized === '..' || normalized.startsWith('../');
}

export function matchesCommand(pattern: string, command: string): boolean {
  return wildcardToRegExp(pattern).test(command.trim().replace(/\s+/g, ' '));
}

export function matchesPath(pattern: string, path: string): boolean {
  if (isOutsideProject(path)) {
    return false;
  }
  return globToRegExp(pattern).test(normalize(path));
}

export function splitCommand(command: string): string[] {
  return command
    .split(/&&|\|\||;|\||\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseRule(rule: string): { tool: string; pattern?: string } {
  const open = rule.indexOf('(');
  if (open === -1 || !rule.endsWith(')')) {
    return { tool: rule.trim() };
  }
  return { tool: rule.slice(0, open).trim(), pattern: rule.slice(open + 1, -1) };
}

function ruleMatches(rule: string, call: ToolCallRequest): boolean {
  const { tool, pattern } = parseRule(rule);
  if (!wildcardToRegExp(tool).test(call.name)) {
    return false;
  }
  if (pattern === undefined) {
    return true;
  }
  const argumentName = PRIMARY_ARGUMENT[call.name];
  const value = argumentName === undefined ? undefined : call.arguments[argumentName];
  if (typeof value !== 'string') {
    return false;
  }
  return PATH_TOOLS.has(call.name) ? matchesPath(pattern, value) : matchesCommand(pattern, value);
}

function evaluateSingle(policy: Policy, call: ToolCallRequest): PolicyResult {
  for (const decision of EVALUATION_ORDER) {
    const rule = policy[decision].find((candidate) => ruleMatches(candidate, call));
    if (rule !== undefined) {
      return { decision, rule };
    }
  }
  return { decision: 'ask', rule: null };
}

export function evaluate(policy: Policy, call: ToolCallRequest): PolicyResult {
  const primary = call.arguments[PRIMARY_ARGUMENT[call.name] ?? ''];
  if (PATH_TOOLS.has(call.name) && typeof primary === 'string' && isOutsideProject(primary)) {
    return { decision: 'deny', rule: null };
  }
  if (call.name !== 'Bash' || typeof primary !== 'string') {
    return evaluateSingle(policy, call);
  }
  const results = splitCommand(primary).map((part) => evaluateSingle(policy, { ...call, arguments: { ...call.arguments, command: part } }));
  if (results.length === 0) {
    return { decision: 'ask', rule: null };
  }
  return results.reduce((strictest, result) => (SEVERITY[result.decision] > SEVERITY[strictest.decision] ? result : strictest));
}

function parseArguments(text: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function reviewToolCalls(response: GenerateResponse, policy: Policy, knownTools: string[]): ReviewedToolCall[] {
  return response.toolCalls.map((toolCall) => {
    const parsed = parseArguments(toolCall.arguments);
    if (!knownTools.includes(toolCall.name) || parsed === undefined) {
      return { toolCallId: toolCall.id, name: toolCall.name, decision: 'deny', rule: null };
    }
    return { toolCallId: toolCall.id, name: toolCall.name, ...evaluate(policy, { name: toolCall.name, arguments: parsed }) };
  });
}
