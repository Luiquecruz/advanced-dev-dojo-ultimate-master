import { cosineSimilarity, embed } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface Principal {
  userId: string;
  tenantId: string;
  groups: string[];
}

export interface SecureDocument {
  id: string;
  tenantId: string;
  text: string;
  allowedGroups: string[];
  allowedUsers?: string[];
}

export interface SecureResult {
  id: string;
  text: string;
  score: number;
}

export type Embedder = (texts: string[]) => number[][];

interface StoredDocument extends SecureDocument {
  vector: number[];
}

export function canRead(principal: Principal, document: SecureDocument): boolean {
  if (principal.tenantId !== document.tenantId) {
    return false;
  }
  return (document.allowedUsers ?? []).includes(principal.userId) || document.allowedGroups.some((group) => principal.groups.includes(group));
}

export function createSecureIndex({ embedder = (texts: string[]) => embed(texts) }: { embedder?: Embedder } = {}) {
  const documents = new Map<string, StoredDocument>();

  const index = {
    upsert(document: SecureDocument): void {
      const existing = documents.get(document.id);
      const vector = existing && existing.text === document.text ? existing.vector : embedder([document.text])[0];
      documents.set(document.id, { ...document, vector });
    },
    remove(id: string): boolean {
      return documents.delete(id);
    },
    count(): number {
      return documents.size;
    },
    search(principal: Principal, query: string, { topK = 3, minScore = -Infinity }: { topK?: number; minScore?: number } = {}): SecureResult[] {
      const readable = [...documents.values()].filter((document) => canRead(principal, document));
      if (readable.length === 0) {
        return [];
      }
      const [queryVector] = embedder([query]);
      return readable
        .map((document) => ({ id: document.id, text: document.text, score: cosineSimilarity(queryVector, document.vector) }))
        .filter((result) => result.score >= minScore)
        .sort((left, right) => right.score - left.score)
        .slice(0, topK);
    },
  };
  return index;
}

export type SecureIndex = ReturnType<typeof createSecureIndex>;

export async function answerQuestion(model: ChatModel, index: SecureIndex, principal: Principal, question: string, { topK = 3, minScore = 0.1 }: { topK?: number; minScore?: number } = {}) {
  const passages = index.search(principal, question, { topK, minScore });
  if (passages.length === 0) {
    return { answer: null, sourceIds: [] as string[] };
  }
  const context = passages.map((passage, position) => `[${position + 1}] ${passage.text}`).join('\n\n');
  const response = await model.generate({
    messages: [
      { role: 'system', content: 'Answer using only the numbered sources and cite them as [n]. If they do not answer the question, say so.' },
      { role: 'user', content: `Sources:\n\n${context}\n\nQuestion: ${question}` },
    ],
  });
  return { answer: response.text, sourceIds: passages.map((passage) => passage.id) };
}
