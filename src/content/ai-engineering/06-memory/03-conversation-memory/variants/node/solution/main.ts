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
  const head: Message[] = [{ role: 'system', content: system }];
  if (summary) {
    head.push({ role: 'system', content: `${SUMMARY_PREFIX} ${summary}` });
  }
  let start = history.length - Math.min(keepRecent, history.length);
  while (start > 0 && countTokens([...head, ...history.slice(start - 1)]) <= maxTokens) {
    start--;
  }
  return { messages: [...head, ...history.slice(start)], overflow: history.slice(0, start) };
}

export async function summarize(model: ChatModel, previousSummary: string, messages: Message[], maxTokens = 300): Promise<string | undefined> {
  const previous = previousSummary ? `Previous summary:\n${previousSummary}\n\n` : '';
  const transcript = messages.map((message) => `${message.role}: ${message.content}`).join('\n');
  try {
    const response = await model.generate({
      messages: [
        { role: 'system', content: SUMMARIZER_PROMPT },
        { role: 'user', content: `${previous}New messages:\n${transcript}` },
      ],
      maxTokens,
    });
    const text = response.text.trim();
    return response.finishReason === 'stop' && text ? text : undefined;
  } catch {
    return undefined;
  }
}

export function createConversationMemory({ model, system, maxTokens, keepRecent, summaryMaxTokens = 300 }: ConversationMemoryOptions) {
  let summary = '';
  let history: Message[] = [];

  const window = () => buildContext({ system, summary, history, maxTokens, keepRecent });

  return {
    add(message: Message): void {
      history.push({ ...message });
    },
    context(): Message[] {
      return window().messages;
    },
    async compact(): Promise<CompactResult> {
      const { overflow } = window();
      if (overflow.length === 0) {
        return { folded: 0, summarized: false };
      }
      const updated = await summarize(model, summary, overflow, summaryMaxTokens);
      if (updated === undefined) {
        return { folded: 0, summarized: false };
      }
      summary = updated;
      history = history.slice(overflow.length);
      return { folded: overflow.length, summarized: true };
    },
    state(): { summary: string; history: Message[] } {
      return { summary, history: history.map((message) => ({ ...message })) };
    },
  };
}
