import type { Model } from '@dojo/ai';

export type Classification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface FieldLabel {
  classification: Classification;
  personal: boolean;
}

export interface PurposeRule {
  allowedFields: string[];
  requiresConsent: boolean;
  maxClassification: Classification;
  retentionDays: number;
}

export interface DataPolicy {
  fields: Record<string, FieldLabel>;
  purposes: Record<string, PurposeRule>;
}

export interface Subject {
  id: string;
  consents: string[];
}

export type CallCheck = { allowed: true; payload: Record<string, unknown>; droppedFields: string[] } | { allowed: false; reasons: string[] };

export interface ProcessingRecord {
  subjectId: string;
  purpose: string;
  fields: string[];
  output: string;
  responseId: string;
  processedAt: string;
  expiresAt: string;
}

export interface ModelCallInput {
  record: Record<string, unknown>;
  subject: Subject;
  purpose: string;
}

export class DataPolicyError extends Error {
  constructor(readonly reasons: string[]) {
    super(`Data policy denied the model call: ${reasons.join(', ')}`);
    this.name = 'DataPolicyError';
  }
}

const RANK: Classification[] = ['public', 'internal', 'confidential', 'restricted'];
const DAY_MS = 24 * 60 * 60 * 1000;

// TODO: label every field from the policy; unlabeled fields count as restricted and are listed in unlabeled
export function classifyRecord(record: Record<string, unknown>, policy: DataPolicy): { fields: Record<string, Classification>; highest: Classification; unlabeled: string[] } {
  throw new Error('Not implemented');
}

// TODO: unknown purpose, missing consent, minimization to allowed labeled fields, classification ceiling of the purpose
export function checkModelCall({ record, subject, purpose }: ModelCallInput, policy: DataPolicy): CallCheck {
  if (!policy.purposes[purpose]) {
    return { allowed: false, reasons: ['unknown-purpose'] };
  }
  return { allowed: true, payload: { ...record }, droppedFields: [] };
}

// TODO: check before calling, throw DataPolicyError without calling the model, send only the payload, store a processing record with its expiry
export async function governedGenerate(
  model: Model,
  input: ModelCallInput & { instruction: string },
  policy: DataPolicy,
  { now, store }: { now: () => number; store: ProcessingRecord[] },
): Promise<{ text: string; record: ProcessingRecord }> {
  const response = await model.generate({
    messages: [
      { role: 'system', content: input.instruction },
      { role: 'user', content: JSON.stringify(input.record) },
    ],
  });
  const record: ProcessingRecord = { subjectId: input.subject.id, purpose: input.purpose, fields: Object.keys(input.record), output: response.text, responseId: response.id, processedAt: new Date(now()).toISOString(), expiresAt: new Date(now()).toISOString() };
  store.push(record);
  return { text: response.text, record };
}

// TODO: split records into kept and purged (expiresAt at or before now)
export function applyRetention(store: ProcessingRecord[], now: number): { kept: ProcessingRecord[]; purged: ProcessingRecord[] } {
  return { kept: store, purged: [] };
}

// TODO: remove every record of the subject and count them
export function eraseSubject(store: ProcessingRecord[], subjectId: string): { kept: ProcessingRecord[]; erased: number } {
  throw new Error('Not implemented');
}
