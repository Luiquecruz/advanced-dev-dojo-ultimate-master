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
  // TODO: same tenant, and the user is listed in allowedUsers or shares a group with allowedGroups; deny otherwise
  return true;
}

export function createSecureIndex({ embedder = (texts: string[]) => embed(texts) }: { embedder?: Embedder } = {}) {
  const documents = new Map<string, StoredDocument>();

  const index = {
    upsert(document: SecureDocument): void {
      // TODO: reuse the stored vector when the text did not change, embed otherwise
      documents.set(document.id, { ...document, vector: embedder([document.text])[0] });
    },
    remove(id: string): boolean {
      // TODO: delete the document
      return false;
    },
    count(): number {
      return documents.size;
    },
    search(principal: Principal, query: string, { topK = 3, minScore = -Infinity }: { topK?: number; minScore?: number } = {}): SecureResult[] {
      // TODO: keep only the documents the principal can read BEFORE ranking
      const [queryVector] = embedder([query]);
      return [...documents.values()]
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
  // TODO: search as the principal, skip the model when nothing is readable, send numbered passages and the question
  throw new Error('Not implemented');
}
