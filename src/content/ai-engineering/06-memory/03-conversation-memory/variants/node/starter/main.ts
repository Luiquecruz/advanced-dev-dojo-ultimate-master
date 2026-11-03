import { countTokens } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse, Message } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface ContextInput {
  system: string;
  summary: string;
  history: Message[];
  maxTokens: number;
  keepRecent: number;
}

export interface ContextWindow {
  messages: Message[];
  overflow: Message[];
}

export interface ConversationMemoryOptions {
  model: ChatModel;
  system: string;
  maxTokens: number;
  keepRecent: number;
  summaryMaxTokens?: number;
}

export interface CompactResult {
  folded: number;
  summarized: boolean;
}

export const SUMMARY_PREFIX = 'Summary of the earlier conversation:';

const SUMMARIZER_PROMPT =
  'You maintain the running summary of a conversation. Merge the previous summary and the new messages into one updated summary. Keep names, numbers, decisions and open questions. Write plain sentences, no preamble.';

export function buildContext({ system, summary, history, maxTokens, keepRecent }: ContextInput): ContextWindow {
  // TODO: system message, then the summary message when there is one, then the longest recent suffix of history that fits maxTokens (countTokens), never fewer than keepRecent messages
  return { messages: [{ role: 'system', content: system }, ...history], overflow: [] };
}

export async function summarize(model: ChatModel, previousSummary: string, messages: Message[], maxTokens = 300): Promise<string | undefined> {
  // TODO: one request with the previous summary and every message, limited to maxTokens; undefined for errors, refusals, filtered, truncated or empty replies
  const response = await model.generate({ messages: [{ role: 'system', content: SUMMARIZER_PROMPT }, ...messages] });
  return response.text;
}

export function createConversationMemory({ model, system, maxTokens, keepRecent, summaryMaxTokens = 300 }: ConversationMemoryOptions) {
  let summary = '';
  let history: Message[] = [];

  return {
    add(message: Message): void {
      history.push({ ...message });
    },
    context(): Message[] {
      // TODO: the messages buildContext keeps for the current summary and history
      return [{ role: 'system', content: system }, ...history];
    },
    async compact(): Promise<CompactResult> {
      // TODO: summarize the overflow into the running summary and drop it from history, but only when the summary succeeded
      return { folded: 0, summarized: false };
    },
    state(): { summary: string; history: Message[] } {
      return { summary, history: history.map((message) => ({ ...message })) };
    },
  };
}
