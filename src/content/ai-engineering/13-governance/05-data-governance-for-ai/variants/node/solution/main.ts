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

export function classifyRecord(record: Record<string, unknown>, policy: DataPolicy): { fields: Record<string, Classification>; highest: Classification; unlabeled: string[] } {
  const fields: Record<string, Classification> = {};
  const unlabeled: string[] = [];
  for (const name of Object.keys(record)) {
    const label = policy.fields[name];
    if (!label) {
      unlabeled.push(name);
    }
    fields[name] = label ? label.classification : 'restricted';
  }
  const highest = Object.values(fields).reduce<Classification>((current, level) => (RANK.indexOf(level) > RANK.indexOf(current) ? level : current), 'public');
  return { fields, highest, unlabeled };
}

export function checkModelCall({ record, subject, purpose }: ModelCallInput, policy: DataPolicy): CallCheck {
  const rule = policy.purposes[purpose];
  if (!rule) {
    return { allowed: false, reasons: ['unknown-purpose'] };
  }
  const reasons: string[] = [];
  if (rule.requiresConsent && !subject.consents.includes(purpose)) {
    reasons.push('missing-consent');
  }
  const payload: Record<string, unknown> = {};
  const droppedFields: string[] = [];
  for (const [name, value] of Object.entries(record)) {
    if (rule.allowedFields.includes(name) && policy.fields[name]) {
      payload[name] = value;
    } else {
      droppedFields.push(name);
    }
  }
  const tooSensitive = Object.keys(payload).some((name) => RANK.indexOf(policy.fields[name].classification) > RANK.indexOf(rule.maxClassification));
  if (tooSensitive) {
    reasons.push('above-purpose-classification');
  }
  return reasons.length > 0 ? { allowed: false, reasons } : { allowed: true, payload, droppedFields };
}

export async function governedGenerate(
  model: Model,
  input: ModelCallInput & { instruction: string },
  policy: DataPolicy,
  { now, store }: { now: () => number; store: ProcessingRecord[] },
): Promise<{ text: string; record: ProcessingRecord }> {
  const check = checkModelCall(input, policy);
  if (!check.allowed) {
    throw new DataPolicyError(check.reasons);
  }
  const response = await model.generate({
    messages: [
      { role: 'system', content: input.instruction },
      { role: 'user', content: JSON.stringify(check.payload) },
    ],
  });
  const processedAt = now();
  const record: ProcessingRecord = {
    subjectId: input.subject.id,
    purpose: input.purpose,
    fields: Object.keys(check.payload),
    output: response.text,
    responseId: response.id,
    processedAt: new Date(processedAt).toISOString(),
    expiresAt: new Date(processedAt + policy.purposes[input.purpose].retentionDays * DAY_MS).toISOString(),
  };
  store.push(record);
  return { text: response.text, record: { ...record } };
}

export function applyRetention(store: ProcessingRecord[], now: number): { kept: ProcessingRecord[]; purged: ProcessingRecord[] } {
  const expired = (record: ProcessingRecord) => Date.parse(record.expiresAt) <= now;
  return { kept: store.filter((record) => !expired(record)), purged: store.filter(expired) };
}

export function eraseSubject(store: ProcessingRecord[], subjectId: string): { kept: ProcessingRecord[]; erased: number } {
  const kept = store.filter((record) => record.subjectId !== subjectId);
  return { kept, erased: store.length - kept.length };
}
