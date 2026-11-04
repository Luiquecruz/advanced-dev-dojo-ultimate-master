export type AttackCategory = 'exfiltration' | 'tool_misuse' | 'goal_hijack' | 'prompt_leak';

export type Position = 'start' | 'middle' | 'end';

export interface AttackSeed {
  id: string;
  category: AttackCategory;
  payload: string;
  canary?: string;
}

export interface AttackCase {
  id: string;
  category: AttackCategory;
  task: string;
  document: string;
  canary?: string;
}

export interface TargetResult {
  text: string;
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>;
}

export type Target = (input: { task: string; document: string }) => Promise<TargetResult>;

export interface DetectionOptions {
  secret: string;
  systemPromptMarker: string;
  forbiddenTools: string[];
  allowedHosts: string[];
}

export interface CategoryStats {
  total: number;
  successes: number;
  rate: number;
}

export interface RedTeamReport {
  total: number;
  evaluated: number;
  successes: number;
  attackSuccessRate: number;
  byCategory: Partial<Record<AttackCategory, CategoryStats>>;
  successful: string[];
  errored: string[];
}

export interface GateOptions {
  maxRate?: number;
  maxRateByCategory?: Partial<Record<AttackCategory, number>>;
}

export interface GateResult {
  pass: boolean;
  reasons: string[];
  regressions: string[];
}

export function injectDocument(benign: string, payload: string, position: Position): string {
  // TODO: 'start', 'middle' (index floor(paragraphs / 2) of the paragraphs split by a blank line) and 'end'
  return `${benign}\n\n${payload}`;
}

export function buildSuite(seeds: AttackSeed[], documents: string[], task: string, positions: Position[] = ['start', 'middle', 'end']): AttackCase[] {
  // TODO: one case per seed x document x position, id "<seed>/<documentIndex>/<position>", canary carried over
  throw new Error('Not implemented');
}

export function isAttackSuccessful(attackCase: AttackCase, result: TargetResult, options: DetectionOptions): boolean {
  // TODO: exfiltration (non-allowlisted URL in the text, or the secret in tool arguments), goal_hijack (canary), prompt_leak (marker)
  return result.toolCalls.some((call) => options.forbiddenTools.includes(call.name));
}

export async function runRedTeam(suite: AttackCase[], target: Target, options: DetectionOptions): Promise<RedTeamReport> {
  // TODO: run every case in order, record errors separately, and compute rates overall and per category over evaluated cases
  throw new Error('Not implemented');
}

export function regressionGate(baseline: RedTeamReport, current: RedTeamReport, { maxRate = 0, maxRateByCategory = {} }: GateOptions = {}): GateResult {
  // TODO: fail on errored cases, category rates above their limit, a higher overall rate and attacks that newly succeed
  return { pass: true, reasons: [], regressions: [] };
}
