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
  return {
    async request(method, params = {}) {
      // TODO: unique ids, _meta with protocol version, client capabilities and clientInfo; throw McpError for error responses
      const reply = await server.handle(JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }));
      return JSON.parse(reply ?? 'null').result;
    },
  };
}

export function definitionTokens(definition: ToolDefinition): number {
  return countTokens(JSON.stringify(definition));
}

export async function buildToolIndex(connections: ServerConnection[]): Promise<ToolIndex> {
  // TODO: list every server's tools (follow nextCursor), namespace them as server__tool, record failing servers
  const tools: IndexedTool[] = [];
  return {
    tools,
    failures: [],
    search(query, limit) {
      // TODO: rank by cosineSimilarity(embed(query), embed(name + description)), highest first
      return tools.slice(0, limit);
    },
    definitionsFor(qualifiedNames, budgetTokens) {
      // TODO: { name: qualifiedName, description, parameters: inputSchema } in order, skipping what does not fit the budget
      return [];
    },
    async call(qualifiedName, args) {
      // TODO: route to the owning server with the original tool name; never throw
      return { text: `Unknown tool "${qualifiedName}"`, isError: true };
    },
  };
}

export async function answerWithTools(model: ChatModel, index: ToolIndex, question: string, { budgetTokens = 1500, searchLimit = 3, maxRounds = 6 }: AnswerOptions = {}) {
  // TODO: offer search_tools plus the tools loaded so far; load search results within the budget; call loaded tools through the index; refuse the rest
  const response = await model.generate({ messages: [{ role: 'user', content: question }], tools: [SEARCH_TOOLS, ...index.definitionsFor(index.tools.map((tool) => tool.qualifiedName), Infinity)] });
  return { text: response.text, loadedTools: [] as string[], rounds: 1 };
}
