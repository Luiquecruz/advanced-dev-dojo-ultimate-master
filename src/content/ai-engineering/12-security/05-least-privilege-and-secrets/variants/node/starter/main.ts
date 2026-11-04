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

export function createCredentialBroker({ grants, ttlMs, now = Date.now }: { grants: Record<string, ToolGrant>; ttlMs: number; now?: () => number }) {
  const issued = new Map<string, Credential>();
  return {
    issue(tool: string, scopes: string[]): Credential {
      // TODO: refuse unknown tools, empty requests and scopes outside the tool's grant with a ScopeError
      const credential: Credential = { token: `tok_${randomUUID()}`, tool, scopes: grants[tool]?.scopes ?? scopes, issuedAt: now(), expiresAt: now() + ttlMs };
      issued.set(credential.token, credential);
      return credential;
    },
    verify(token: string, tool: string, scope: string): Verification {
      // TODO: check expiry (expired at expiresAt), the tool and the scope
      return issued.has(token) ? { valid: true } : { valid: false, reason: 'unknown' };
    },
    revoke(token: string): void {
      // TODO: forget the token
    },
    allowedSecrets(tool: string): string[] {
      return [...(grants[tool]?.secrets ?? [])];
    },
  };
}

export function resolvePlaceholders<T>(value: T, vault: Vault, allowedSecrets: string[]): T {
  // TODO: replace {{secret:NAME}} in nested strings, arrays and objects; throw SecretAccessError for names that are not allowed or missing
  throw new Error('Not implemented');
}

export function redactSecrets(text: string, vault: Vault): string {
  // TODO: also redact base64 and URL-encoded forms, longest first, and skip empty values
  return Object.entries(vault).reduce((redacted, [name, value]) => redacted.split(value).join(`[REDACTED:${name}]`), text);
}

export function findLeakedSecrets(messages: Message[], vault: Vault): string[] {
  // TODO: names of the secrets whose value (raw, base64 or URL-encoded) appears in any message content or tool call arguments
  throw new Error('Not implemented');
}

export async function executeToolCall(
  toolCall: ToolCall,
  { tools, broker, vault, audit = [] }: { tools: Record<string, ToolImplementation>; broker: CredentialBroker; vault: Vault; audit?: AuditEntry[] },
): Promise<Message> {
  // TODO: parse, audit with placeholders, resolve secrets, issue a credential, execute, redact, revoke; never throw
  throw new Error('Not implemented');
}
