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

function inputSchemaOf(input: z.ZodType): Record<string, unknown> {
  const { $schema, ...schema } = z.toJSONSchema(input, { io: 'input' }) as Record<string, unknown>;
  return schema;
}

function textResult(text: string, isError: boolean, structuredContent?: unknown) {
  const content = [{ type: 'text', text }];
  return structuredContent === undefined ? { content, isError } : { content, structuredContent, isError };
}

function checkMeta(params: Params): void {
  const meta = params._meta;
  if (!isObject(meta) || typeof meta[PROTOCOL_VERSION_KEY] !== 'string' || !isObject(meta[CLIENT_CAPABILITIES_KEY])) {
    throw new ProtocolError(ErrorCode.InvalidParams, `Every request must carry _meta["${PROTOCOL_VERSION_KEY}"] and _meta["${CLIENT_CAPABILITIES_KEY}"]`);
  }
  const requested = meta[PROTOCOL_VERSION_KEY];
  if (requested !== PROTOCOL_VERSION) {
    throw new ProtocolError(ErrorCode.UnsupportedProtocolVersion, 'Unsupported protocol version', { supported: [PROTOCOL_VERSION], requested });
  }
}

export function createMcpServer({ name, version, instructions, tools, resources }: ServerOptions): McpServer {
  const serverMeta = { [SERVER_INFO_KEY]: { name, version } };

  async function callTool(params: Params) {
    if (typeof params.name !== 'string') {
      throw new ProtocolError(ErrorCode.InvalidParams, 'tools/call requires a string "name"');
    }
    const tool = tools.find((candidate) => candidate.name === params.name);
    if (!tool) {
      throw new ProtocolError(ErrorCode.InvalidParams, `Unknown tool: ${params.name}`);
    }
    const args = params.arguments ?? {};
    if (!isObject(args)) {
      throw new ProtocolError(ErrorCode.InvalidParams, 'tools/call "arguments" must be an object');
    }
    const parsed = tool.input.safeParse(args);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `- ${issue.path.join('.') || '(root)'}: ${issue.message}`).join('\n');
      return textResult(`Invalid arguments for ${tool.name}:\n${issues}`, true);
    }
    try {
      const value = await tool.handler(parsed.data);
      return typeof value === 'string' ? textResult(value, false) : textResult(JSON.stringify(value), false, value);
    } catch (error) {
      return textResult(`${tool.name} failed: ${error instanceof Error ? error.message : String(error)}`, true);
    }
  }

  async function readResource(params: Params) {
    if (typeof params.uri !== 'string') {
      throw new ProtocolError(ErrorCode.InvalidParams, 'resources/read requires a string "uri"');
    }
    const resource = resources.find((candidate) => candidate.uri === params.uri);
    if (!resource) {
      throw new ProtocolError(ErrorCode.InvalidParams, 'Resource not found', { uri: params.uri });
    }
    return { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: await resource.read() }], ...CACHE };
  }

  async function dispatch(method: string, params: Params): Promise<Record<string, unknown>> {
    switch (method) {
      case 'server/discover':
        return { supportedVersions: [PROTOCOL_VERSION], capabilities: { tools: {}, resources: {} }, ...(instructions ? { instructions } : {}), ...CACHE };
      case 'tools/list':
        return { tools: tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: inputSchemaOf(tool.input) })), ...CACHE };
      case 'tools/call':
        return callTool(params);
      case 'resources/list':
        return { resources: resources.map(({ uri, name: resourceName, mimeType, description }) => ({ uri, name: resourceName, mimeType, ...(description ? { description } : {}) })), ...CACHE };
      case 'resources/read':
        return readResource(params);
      default:
        throw new ProtocolError(ErrorCode.MethodNotFound, `Method not found: ${method}`);
    }
  }

  return {
    async handle(message: string): Promise<string | undefined> {
      let request: unknown;
      try {
        request = JSON.parse(message);
      } catch {
        return failure(null, ErrorCode.ParseError, 'Parse error');
      }
      if (!isObject(request) || request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
        const id = isObject(request) && (typeof request.id === 'string' || typeof request.id === 'number') ? request.id : null;
        return failure(id, ErrorCode.InvalidRequest, 'Invalid Request');
      }
      if (!('id' in request)) {
        return undefined;
      }
      if (typeof request.id !== 'string' && typeof request.id !== 'number') {
        return failure(null, ErrorCode.InvalidRequest, 'Request id must be a string or a number');
      }
      const id = request.id;
      if (request.method === 'initialize') {
        return failure(id, ErrorCode.MethodNotFound, `initialize is not supported: this server speaks MCP ${PROTOCOL_VERSION}, which has no handshake. Send the protocol version in _meta on every request.`);
      }
      if (request.params !== undefined && !isObject(request.params)) {
        return failure(id, ErrorCode.InvalidParams, 'params must be an object');
      }
      const params = (request.params ?? {}) as Params;
      try {
        checkMeta(params);
        const result = await dispatch(request.method, params);
        return JSON.stringify({ jsonrpc: '2.0', id, result: { resultType: 'complete', ...result, _meta: serverMeta } });
      } catch (error) {
        if (error instanceof ProtocolError) {
          return failure(id, error.code, error.message, error.data);
        }
        return failure(id, ErrorCode.InternalError, 'Internal error');
      }
    },
  };
}
