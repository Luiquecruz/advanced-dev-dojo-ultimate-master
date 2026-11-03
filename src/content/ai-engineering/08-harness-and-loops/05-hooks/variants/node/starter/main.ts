import type { GenerateResponse, Message } from '@dojo/ai';

export interface ToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export type PreHookResult = { action: 'continue' } | { action: 'block'; reason: string } | { action: 'rewrite'; arguments: Record<string, unknown> };
export type PostHookResult = { action: 'continue' } | { action: 'replace'; output: string };

export interface PreToolHook {
  name: string;
  matcher: string;
  run(call: ToolCallRequest): PreHookResult | Promise<PreHookResult>;
}

export interface PostToolHook {
  name: string;
  matcher: string;
  run(call: ToolCallRequest, output: string): PostHookResult | Promise<PostHookResult>;
}

export type ToolRunResult = { status: 'ok'; output: string; arguments: Record<string, unknown> } | { status: 'blocked'; hook: string; reason: string };

export type Execute = (call: ToolCallRequest) => string | Promise<string>;

export interface HookRunnerOptions {
  pre?: PreToolHook[];
  post?: PostToolHook[];
  timeoutMs?: number;
}

export interface HookRunner {
  run(call: ToolCallRequest, execute: Execute): Promise<ToolRunResult>;
}

export const DANGEROUS_COMMANDS: RegExp[] = [
  /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f?[a-zA-Z]*\s+(\/|~|\$HOME)(\s|$)/,
  /\bgit\s+push\b.*(--force\b|\s-f\b)/,
  /\b(curl|wget)\b.*\|\s*(sh|bash|zsh)\b/,
  /\bmkfs(\.\w+)?\b/,
  /\bchmod\s+-R\s+777\b/,
];

export const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_-]{16,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /ghp_[A-Za-z0-9]{36}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

function matchesTool(matcher: string, toolName: string): boolean {
  return matcher === '*' || matcher.split('|').some((name) => name.trim() === toolName);
}

// TODO: run matching pre hooks in order (rewrite, first block wins), execute once, run matching post hooks in order; fail closed on errors, timeouts and invalid results
export function createHookRunner({ pre = [], post = [], timeoutMs = 1000 }: HookRunnerOptions = {}): HookRunner {
  return {
    async run(call, execute) {
      for (const hook of pre.filter((candidate) => matchesTool(candidate.matcher, call.name))) {
        const result = await hook.run(call);
        if (result.action === 'block') {
          return { status: 'blocked', hook: hook.name, reason: result.reason };
        }
      }
      const output = await execute(call);
      return { status: 'ok', output, arguments: call.arguments };
    },
  };
}

// TODO: block Bash commands that match DANGEROUS_COMMANDS, quoting the command in the reason
export function blockDangerousCommands(): PreToolHook {
  return { name: 'block-dangerous-commands', matcher: 'Bash', run: () => ({ action: 'continue' }) };
}

// TODO: rewrite timeoutMs to min(timeoutMs, maxMs), or maxMs when it is missing or not a number
export function capTimeout(maxMs: number): PreToolHook {
  return { name: 'cap-timeout', matcher: 'Bash', run: (call) => ({ action: 'rewrite', arguments: { ...call.arguments, timeoutMs: maxMs } }) };
}

// TODO: replace every SECRET_PATTERNS match in the output with [REDACTED]
export function redactSecrets(): PostToolHook {
  return { name: 'redact-secrets', matcher: '*', run: () => ({ action: 'continue' }) };
}

// TODO: one tool message per call: Error: for bad arguments or unknown tools, "Blocked by <hook>: <reason>" for blocked calls, the output otherwise
export async function runToolCalls(response: GenerateResponse, runner: HookRunner, tools: Record<string, Execute>): Promise<Message[]> {
  const messages: Message[] = [];
  for (const toolCall of response.toolCalls) {
    const result = await runner.run({ name: toolCall.name, arguments: JSON.parse(toolCall.arguments) }, tools[toolCall.name]);
    messages.push({ role: 'tool', toolCallId: toolCall.id, content: result.status === 'ok' ? result.output : result.reason });
  }
  return messages;
}
