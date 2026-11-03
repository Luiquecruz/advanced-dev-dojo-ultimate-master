import { cosineSimilarity, countTokens, embed } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse, Message, ToolDefinition } from '@dojo/ai';
import type { McpServer } from './servers';

export const PROTOCOL_VERSION = '2026-07-28';
export const SEPARATOR = '__';

export class McpError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'McpError';
    this.code = code;
    this.data = data;
  }
}

export class ToolLoopLimitError extends Error {
  constructor(rounds: number) {
    super(`The model still requested tools after ${rounds} rounds`);
    this.name = 'ToolLoopLimitError';
  }
}

export interface ServerConnection {
  id: string;
  server: McpServer;
}

export interface McpClient {
  request(method: string, params?: Record<string, unknown>): Promise<any>;
}

export interface IndexedTool {
  qualifiedName: string;
  serverId: string;
  toolName: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolResult {
  text: string;
  isError: boolean;
}

export interface ToolIndex {
  tools: IndexedTool[];
  failures: Array<{ serverId: string; message: string }>;
  search(query: string, limit: number): IndexedTool[];
  definitionsFor(qualifiedNames: string[], budgetTokens: number): ToolDefinition[];
  call(qualifiedName: string, args: Record<string, unknown>): Promise<ToolResult>;
}

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface AnswerOptions {
  budgetTokens?: number;
  searchLimit?: number;
  maxRounds?: number;
}

export const SEARCH_TOOLS: ToolDefinition = {
  name: 'search_tools',
  description: 'Find and load the tools you need for a task. Describe the task in a few words; the matching tools become available on your next turn.',
  parameters: { type: 'object', properties: { query: { type: 'string', description: 'What you need to do, such as "refund an invoice"' } }, required: ['query'] },
};

export function createMcpClient(server: McpServer, clientInfo = { name: 'dojo-agent', version: '1.0.0' }): McpClient {
  let nextId = 1;
  return {
    async request(method, params = {}) {
      const _meta = { 'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION, 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': clientInfo };
      const reply = await server.handle(JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params: { ...params, _meta } }));
      const response = JSON.parse(reply ?? 'null');
      if (response === null) {
        throw new McpError(-32603, `No response to ${method}`);
      }
      if (response.error) {
        throw new McpError(response.error.code, response.error.message, response.error.data);
      }
      return response.result;
    },
  };
}

export function definitionTokens(definition: ToolDefinition): number {
  return countTokens(JSON.stringify(definition));
}

export async function buildToolIndex(connections: ServerConnection[]): Promise<ToolIndex> {
  const tools: IndexedTool[] = [];
  const failures: Array<{ serverId: string; message: string }> = [];
  const clients = new Map<string, McpClient>();

  for (const { id, server } of connections) {
    const client = createMcpClient(server);
    try {
      const found: IndexedTool[] = [];
      let cursor: string | undefined;
      do {
        const page = await client.request('tools/list', cursor === undefined ? {} : { cursor });
        for (const tool of page.tools) {
          found.push({ qualifiedName: `${id}${SEPARATOR}${tool.name}`, serverId: id, toolName: tool.name, description: tool.description ?? '', inputSchema: tool.inputSchema });
        }
        cursor = page.nextCursor;
      } while (cursor !== undefined);
      tools.push(...found);
      clients.set(id, client);
    } catch (error) {
      failures.push({ serverId: id, message: error instanceof Error ? error.message : String(error) });
    }
  }

  const vectors = new Map(tools.map((tool) => [tool.qualifiedName, embed(`${tool.toolName.replace(/_/g, ' ')} ${tool.description}`)]));
  const byName = new Map(tools.map((tool) => [tool.qualifiedName, tool]));

  return {
    tools,
    failures,
    search(query, limit) {
      const target = embed(query);
      return tools
        .map((tool, position) => ({ tool, position, score: cosineSimilarity(target, vectors.get(tool.qualifiedName)!) }))
        .sort((left, right) => right.score - left.score || left.position - right.position)
        .slice(0, limit)
        .map(({ tool }) => tool);
    },
    definitionsFor(qualifiedNames, budgetTokens) {
      const definitions: ToolDefinition[] = [];
      let used = 0;
      for (const name of qualifiedNames) {
        const tool = byName.get(name);
        if (!tool) {
          continue;
        }
        const definition = { name: tool.qualifiedName, description: tool.description, parameters: tool.inputSchema };
        const cost = definitionTokens(definition);
        if (used + cost <= budgetTokens) {
          definitions.push(definition);
          used += cost;
        }
      }
      return definitions;
    },
    async call(qualifiedName, args) {
      const tool = byName.get(qualifiedName);
      if (!tool) {
        return { text: `Unknown tool "${qualifiedName}". Use search_tools to find the right one.`, isError: true };
      }
      try {
        const result = await clients.get(tool.serverId)!.request('tools/call', { name: tool.toolName, arguments: args });
        const text = result.content.filter((block: { type: string }) => block.type === 'text').map((block: { text: string }) => block.text).join('\n');
        return { text, isError: result.isError === true };
      } catch (error) {
        return { text: `${qualifiedName} failed: ${error instanceof Error ? error.message : String(error)}`, isError: true };
      }
    },
  };
}

function parseArguments(raw: string): Record<string, unknown> | undefined {
  try {
    const value = JSON.parse(raw);
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export async function answerWithTools(model: ChatModel, index: ToolIndex, question: string, { budgetTokens = 1500, searchLimit = 3, maxRounds = 6 }: AnswerOptions = {}) {
  const messages: Message[] = [{ role: 'user', content: question }];
  const loaded: ToolDefinition[] = [];
  for (let round = 1; round <= maxRounds; round++) {
    const response = await model.generate({ messages: [...messages], tools: [SEARCH_TOOLS, ...loaded] });
    if (response.toolCalls.length === 0) {
      return { text: response.text, loadedTools: loaded.map((definition) => definition.name), rounds: round };
    }
    if (round === maxRounds) {
      throw new ToolLoopLimitError(round);
    }
    messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
    for (const call of response.toolCalls) {
      const args = parseArguments(call.arguments);
      let content: string;
      if (!args) {
        content = JSON.stringify({ error: `Arguments for ${call.name} must be a JSON object.` });
      } else if (call.name === SEARCH_TOOLS.name) {
        const loadedNames = new Set(loaded.map((definition) => definition.name));
        const candidates = index.search(String(args.query ?? ''), searchLimit).map((tool) => tool.qualifiedName).filter((name) => !loadedNames.has(name));
        const used = loaded.reduce((total, definition) => total + definitionTokens(definition), 0);
        const added = index.definitionsFor(candidates, budgetTokens - used);
        loaded.push(...added);
        content = JSON.stringify({ loaded: added.map((definition) => definition.name) });
      } else if (loaded.some((definition) => definition.name === call.name)) {
        const result = await index.call(call.name, args);
        content = result.isError ? JSON.stringify({ error: result.text }) : result.text;
      } else {
        content = JSON.stringify({ error: `Tool "${call.name}" is not loaded. Call search_tools first.` });
      }
      messages.push({ role: 'tool', toolCallId: call.id, content });
    }
  }
  throw new ToolLoopLimitError(maxRounds);
}
