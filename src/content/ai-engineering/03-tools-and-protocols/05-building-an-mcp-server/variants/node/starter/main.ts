import { z } from 'zod';

export const PROTOCOL_VERSION = '2026-07-28';
export const PROTOCOL_VERSION_KEY = 'io.modelcontextprotocol/protocolVersion';
export const CLIENT_CAPABILITIES_KEY = 'io.modelcontextprotocol/clientCapabilities';
export const SERVER_INFO_KEY = 'io.modelcontextprotocol/serverInfo';

export const ErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  UnsupportedProtocolVersion: -32022,
} as const;

export interface ServerTool {
  name: string;
  description: string;
  input: z.ZodType;
  handler(args: any): unknown | Promise<unknown>;
}

export interface ServerResource {
  uri: string;
  name: string;
  mimeType: string;
  description?: string;
  read(): string | Promise<string>;
}

export interface ServerOptions {
  name: string;
  version: string;
  instructions?: string;
  tools: ServerTool[];
  resources: ServerResource[];
}

export interface McpServer {
  handle(message: string): Promise<string | undefined>;
}

type RequestId = string | number | null;
type Params = Record<string, unknown>;

class ProtocolError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

const CACHE = { ttlMs: 60_000, cacheScope: 'public' };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function failure(id: RequestId, code: number, message: string, data?: unknown): string {
  return JSON.stringify({ jsonrpc: '2.0', id, error: data === undefined ? { code, message } : { code, message, data } });
}

export function createMcpServer({ name, version, instructions, tools, resources }: ServerOptions): McpServer {
  return {
    async handle(message: string): Promise<string | undefined> {
      let request: any;
      try {
        request = JSON.parse(message);
      } catch {
        return failure(null, ErrorCode.ParseError, 'Parse error');
      }
      // TODO: validate the JSON-RPC envelope (-32600), stay silent for notifications, reject the legacy initialize handshake
      // TODO: require _meta protocol version and client capabilities on every request (-32602, -32022 with { supported, requested })
      // TODO: server/discover, tools/list, tools/call (content + isError), resources/list, resources/read, each result with resultType 'complete' and _meta serverInfo
      return failure(request.id ?? null, ErrorCode.MethodNotFound, `Method not found: ${request.method}`);
    },
  };
}
