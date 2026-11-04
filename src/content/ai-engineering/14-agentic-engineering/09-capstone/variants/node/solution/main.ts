import { createModel } from '@dojo/ai';
import { runAgent } from './agent';
import type { AgentResult, Budget, ChatModel } from './agent';
import { DOCUMENTS, GOLDEN_SET, INVOICES } from './briefing';
import { runEvals } from './evals';
import type { EvalReport } from './evals';
import { createMcpClient, createSupportServer } from './mcp';
import type { McpClient, SupportServer } from './mcp';
import { SUPPORT_POLICY } from './policy';
import type { ToolCallRequest } from './policy';
import { createRetriever } from './retrieval';

export * from './agent';
export * from './briefing';
export * from './evals';
export * from './governance';
export * from './mcp';
export * from './policy';
export * from './retrieval';

export const MODEL_ID = 'dojo-fake-1-2026-10-01';
export const DEFAULT_BUDGET: Budget = { maxSteps: 6, maxCostUsd: 0.05 };
export const EVAL_THRESHOLD = 0.8;

export interface SupportAssistant {
  support: SupportServer;
  client: McpClient;
  ask(question: string): Promise<AgentResult>;
}

export interface AssistantOptions {
  model?: ChatModel;
  approve?: (call: ToolCallRequest) => boolean | Promise<boolean>;
  budget?: Budget;
}

export function createSupportAssistant({ model = createModel({ model: MODEL_ID }), approve, budget = DEFAULT_BUDGET }: AssistantOptions = {}): SupportAssistant {
  const support = createSupportServer({ retriever: createRetriever(DOCUMENTS), invoices: INVOICES });
  const client = createMcpClient(support.server);
  return { support, client, ask: (question) => runAgent(question, { model, client, policy: SUPPORT_POLICY, approve, budget }) };
}

export function evaluateAssistant(assistant: SupportAssistant): Promise<EvalReport> {
  return runEvals(GOLDEN_SET, assistant.ask, { threshold: EVAL_THRESHOLD });
}
