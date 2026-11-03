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

class HookFailure extends Error {}

function matchesTool(matcher: string, toolName: string): boolean {
  return matcher === '*' || matcher.split('|').some((name) => name.trim() === toolName);
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

async function withTimeout<T>(work: () => T | Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new HookFailure(`timed out after ${timeoutMs} ms`)), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(work), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function validPreResult(result: unknown): result is PreHookResult {
  if (!isObject(result)) {
    return false;
  }
  return result.action === 'continue' || (result.action === 'block' && typeof result.reason === 'string') || (result.action === 'rewrite' && isObject(result.arguments));
}

function validPostResult(result: unknown): result is PostHookResult {
  return isObject(result) && (result.action === 'continue' || (result.action === 'replace' && typeof result.output === 'string'));
}

const failureReason = (error: unknown) => `hook failed: ${error instanceof Error ? error.message : String(error)}`;

export function createHookRunner({ pre = [], post = [], timeoutMs = 1000 }: HookRunnerOptions = {}): HookRunner {
  return {
    async run(call, execute) {
      let current: ToolCallRequest = { name: call.name, arguments: { ...call.arguments } };
      for (const hook of pre.filter((candidate) => matchesTool(candidate.matcher, call.name))) {
        let result: PreHookResult;
        try {
          const returned = await withTimeout(() => hook.run(current), timeoutMs);
          if (!validPreResult(returned)) {
            throw new HookFailure('returned an invalid result');
          }
          result = returned;
        } catch (error) {
          return { status: 'blocked', hook: hook.name, reason: failureReason(error) };
        }
        if (result.action === 'block') {
          return { status: 'blocked', hook: hook.name, reason: result.reason };
        }
        if (result.action === 'rewrite') {
          current = { name: current.name, arguments: { ...result.arguments } };
        }
      }
      let output = await execute(current);
      for (const hook of post.filter((candidate) => matchesTool(candidate.matcher, call.name))) {
        try {
          const result = await withTimeout(() => hook.run(current, output), timeoutMs);
          if (!validPostResult(result)) {
            throw new HookFailure('returned an invalid result');
          }
          if (result.action === 'replace') {
            output = result.output;
          }
        } catch (error) {
          return { status: 'blocked', hook: hook.name, reason: failureReason(error) };
        }
      }
      return { status: 'ok', output, arguments: current.arguments };
    },
  };
}

export function blockDangerousCommands(): PreToolHook {
  return {
    name: 'block-dangerous-commands',
    matcher: 'Bash',
    run(call) {
      const command = String(call.arguments.command ?? '');
      return DANGEROUS_COMMANDS.some((pattern) => pattern.test(command)) ? { action: 'block', reason: `"${command}" matches a dangerous command pattern` } : { action: 'continue' };
    },
  };
}

export function capTimeout(maxMs: number): PreToolHook {
  return {
    name: 'cap-timeout',
    matcher: 'Bash',
    run(call) {
      const requested = call.arguments.timeoutMs;
      const timeoutMs = typeof requested === 'number' && !Number.isNaN(requested) ? Math.min(requested, maxMs) : maxMs;
      return { action: 'rewrite', arguments: { ...call.arguments, timeoutMs } };
    },
  };
}

export function redactSecrets(): PostToolHook {
  return {
    name: 'redact-secrets',
    matcher: '*',
    run(_call, output) {
      return { action: 'replace', output: SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, '[REDACTED]'), output) };
    },
  };
}

function parseArguments(text: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(text);
    return isObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function runToolCalls(response: GenerateResponse, runner: HookRunner, tools: Record<string, Execute>): Promise<Message[]> {
  const messages: Message[] = [];
  for (const toolCall of response.toolCalls) {
    const parsed = parseArguments(toolCall.arguments);
    const execute = tools[toolCall.name];
    if (parsed === undefined || execute === undefined) {
      messages.push({ role: 'tool', toolCallId: toolCall.id, content: `Error: ${parsed === undefined ? 'arguments are not a JSON object' : `unknown tool ${toolCall.name}`}` });
      continue;
    }
    const result = await runner.run({ name: toolCall.name, arguments: parsed }, execute);
    const content = result.status === 'ok' ? result.output : `Blocked by ${result.hook}: ${result.reason}`;
    messages.push({ role: 'tool', toolCallId: toolCall.id, content });
  }
  return messages;
}
