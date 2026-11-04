import { randomUUID } from 'node:crypto';
import type { Message, ToolCall } from '@dojo/ai';

export interface ToolGrant {
  scopes: string[];
  secrets?: string[];
}

export interface Credential {
  token: string;
  tool: string;
  scopes: string[];
  issuedAt: number;
  expiresAt: number;
}

export type Verification = { valid: true } | { valid: false; reason: 'unknown' | 'expired' | 'wrong_tool' | 'scope' };

export interface ToolImplementation {
  scope: string;
  execute(args: Record<string, unknown>, credential: Credential): string | Promise<string>;
}

export interface AuditEntry {
  tool: string;
  scope: string;
  arguments: Record<string, unknown>;
}

export type Vault = Record<string, string>;

export class ScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScopeError';
  }
}

export class SecretAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecretAccessError';
  }
}

export type CredentialBroker = ReturnType<typeof createCredentialBroker>;

const PLACEHOLDER = /\{\{secret:([A-Za-z0-9_]+)\}\}/g;

export function createCredentialBroker({ grants, ttlMs, now = Date.now }: { grants: Record<string, ToolGrant>; ttlMs: number; now?: () => number }) {
  const issued = new Map<string, Credential>();
  return {
    issue(tool: string, scopes: string[]): Credential {
      const grant = grants[tool];
      if (!grant) {
        throw new ScopeError(`No grant for tool "${tool}"`);
      }
      if (scopes.length === 0) {
        throw new ScopeError(`Tool "${tool}" requested no scope`);
      }
      const denied = scopes.filter((scope) => !grant.scopes.includes(scope));
      if (denied.length > 0) {
        throw new ScopeError(`Tool "${tool}" may not use ${denied.join(', ')}`);
      }
      const issuedAt = now();
      const credential: Credential = { token: `tok_${randomUUID()}`, tool, scopes: [...new Set(scopes)], issuedAt, expiresAt: issuedAt + ttlMs };
      issued.set(credential.token, credential);
      return { ...credential, scopes: [...credential.scopes] };
    },
    verify(token: string, tool: string, scope: string): Verification {
      const credential = issued.get(token);
      if (!credential) {
        return { valid: false, reason: 'unknown' };
      }
      if (now() >= credential.expiresAt) {
        return { valid: false, reason: 'expired' };
      }
      if (credential.tool !== tool) {
        return { valid: false, reason: 'wrong_tool' };
      }
      if (!credential.scopes.includes(scope)) {
        return { valid: false, reason: 'scope' };
      }
      return { valid: true };
    },
    revoke(token: string): void {
      issued.delete(token);
    },
    allowedSecrets(tool: string): string[] {
      return [...(grants[tool]?.secrets ?? [])];
    },
  };
}

export function resolvePlaceholders<T>(value: T, vault: Vault, allowedSecrets: string[]): T {
  if (typeof value === 'string') {
    return value.replace(PLACEHOLDER, (_, name: string) => {
      if (!allowedSecrets.includes(name) || vault[name] === undefined) {
        throw new SecretAccessError(`Secret ${name} is not available to this tool`);
      }
      return vault[name];
    }) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolvePlaceholders(item, vault, allowedSecrets)) as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolvePlaceholders(item, vault, allowedSecrets)])) as T;
  }
  return value;
}

function secretForms(value: string): string[] {
  return [...new Set([value, Buffer.from(value, 'utf8').toString('base64'), encodeURIComponent(value)])];
}

export function redactSecrets(text: string, vault: Vault): string {
  const forms = Object.entries(vault)
    .filter(([, value]) => value.length > 0)
    .flatMap(([name, value]) => secretForms(value).map((form) => ({ name, form })))
    .sort((left, right) => right.form.length - left.form.length);
  return forms.reduce((redacted, { name, form }) => redacted.split(form).join(`[REDACTED:${name}]`), text);
}

export function findLeakedSecrets(messages: Message[], vault: Vault): string[] {
  const texts = messages.flatMap((message) => [message.content, ...(message.toolCalls ?? []).map((call) => call.arguments)]);
  return Object.entries(vault)
    .filter(([, value]) => value.length > 0)
    .filter(([, value]) => secretForms(value).some((form) => texts.some((text) => text.includes(form))))
    .map(([name]) => name);
}

export async function executeToolCall(
  toolCall: ToolCall,
  { tools, broker, vault, audit = [] }: { tools: Record<string, ToolImplementation>; broker: CredentialBroker; vault: Vault; audit?: AuditEntry[] },
): Promise<Message> {
  const reply = (content: string, extra: Vault = {}): Message => ({ role: 'tool', toolCallId: toolCall.id, content: redactSecrets(content, { ...vault, ...extra }) });
  let args: unknown;
  try {
    args = JSON.parse(toolCall.arguments);
  } catch {
    return reply('Error: arguments must be a JSON object');
  }
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return reply('Error: arguments must be a JSON object');
  }
  const tool = tools[toolCall.name];
  if (!tool) {
    return reply(`Error: unknown tool ${toolCall.name}`);
  }
  audit.push({ tool: toolCall.name, scope: tool.scope, arguments: JSON.parse(toolCall.arguments) });
  let credential: Credential;
  let resolved: Record<string, unknown>;
  try {
    resolved = resolvePlaceholders(args as Record<string, unknown>, vault, broker.allowedSecrets(toolCall.name));
    credential = broker.issue(toolCall.name, [tool.scope]);
  } catch (error) {
    return reply(`Error: ${(error as Error).message}`);
  }
  try {
    return reply(await tool.execute(resolved, credential), { CREDENTIAL: credential.token });
  } catch (error) {
    return reply(`Error: ${(error as Error).message}`, { CREDENTIAL: credential.token });
  } finally {
    broker.revoke(credential.token);
  }
}
