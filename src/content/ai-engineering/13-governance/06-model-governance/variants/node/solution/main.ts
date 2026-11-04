import { createModel, type GenerateRequest, type GenerateResponse } from '@dojo/ai';

export interface ModelVersion {
  id: string;
  provider: string;
  license: string;
  retiresAt?: string;
  replacement?: string;
}

export interface PromotionGate {
  minimums: Record<string, number>;
  maxRegression: number;
}

export type PromotionResult = { promoted: true; alias: string; versionId: string; previous?: string } | { promoted: false; reasons: string[] };

export interface Resolution {
  versionId: string;
  warnings: string[];
}

export interface ModelRegistry {
  register(version: ModelVersion): void;
  recordEval(versionId: string, suite: string, score: number): void;
  promote(alias: string, versionId: string, gate: PromotionGate): PromotionResult;
  resolve(alias: string): Resolution;
  rollback(alias: string): string;
  history(alias: string): string[];
}

export interface RegistryOptions {
  now: () => number;
  allowedLicenses: string[];
  warnWithinDays?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function createModelRegistry({ now, allowedLicenses, warnWithinDays = 30 }: RegistryOptions): ModelRegistry {
  const versions = new Map<string, ModelVersion>();
  const scores = new Map<string, Map<string, number>>();
  const pins = new Map<string, string[]>();
  const histories = new Map<string, string[]>();

  const isRetired = (version: ModelVersion) => version.retiresAt !== undefined && Date.parse(version.retiresAt) <= now();
  const current = (alias: string) => pins.get(alias)?.at(-1);

  function pin(alias: string, versionId: string) {
    histories.set(alias, [...(histories.get(alias) ?? []), versionId]);
  }

  return {
    register(version) {
      if (versions.has(version.id)) {
        throw new Error(`Model version "${version.id}" is already registered`);
      }
      if (/latest$/i.test(version.id)) {
        throw new Error(`"${version.id}" is a floating alias; register a pinned, dated version`);
      }
      if (!allowedLicenses.includes(version.license)) {
        throw new Error(`License "${version.license}" of "${version.id}" is not approved`);
      }
      versions.set(version.id, { ...version });
      scores.set(version.id, new Map());
    },
    recordEval(versionId, suite, score) {
      const results = scores.get(versionId);
      if (!results) {
        throw new Error(`Unknown model version "${versionId}"`);
      }
      results.set(suite, score);
    },
    promote(alias, versionId, gate) {
      const version = versions.get(versionId);
      if (!version) {
        return { promoted: false, reasons: ['unknown-version'] };
      }
      const reasons: string[] = [];
      if (isRetired(version)) {
        reasons.push('retired');
      }
      const candidate = scores.get(versionId)!;
      const previous = current(alias);
      const baseline = previous ? scores.get(previous)! : new Map<string, number>();
      for (const [suite, minimum] of Object.entries(gate.minimums)) {
        const score = candidate.get(suite);
        if (score === undefined) {
          reasons.push(`missing-eval:${suite}`);
          continue;
        }
        if (score < minimum) {
          reasons.push(`below-minimum:${suite}`);
        }
        const baselineScore = baseline.get(suite);
        if (baselineScore !== undefined && score < baselineScore - gate.maxRegression) {
          reasons.push(`regression:${suite}`);
        }
      }
      if (reasons.length > 0) {
        return { promoted: false, reasons };
      }
      pins.set(alias, [...(pins.get(alias) ?? []), versionId]);
      pin(alias, versionId);
      return previous ? { promoted: true, alias, versionId, previous } : { promoted: true, alias, versionId };
    },
    resolve(alias) {
      const versionId = current(alias);
      if (!versionId) {
        throw new Error(`Unknown alias "${alias}"`);
      }
      const version = versions.get(versionId)!;
      if (isRetired(version)) {
        throw new Error(`"${alias}" is pinned to ${versionId}, which retired on ${version.retiresAt}`);
      }
      const warnings: string[] = [];
      if (version.retiresAt) {
        const remaining = Date.parse(version.retiresAt) - now();
        if (remaining <= warnWithinDays * DAY_MS) {
          const days = Math.ceil(remaining / DAY_MS);
          warnings.push(`${versionId} retires on ${version.retiresAt} (in ${days} days); migrate to ${version.replacement ?? 'a replacement that is not registered yet'}`);
        }
      }
      return { versionId, warnings };
    },
    rollback(alias) {
      const stack = pins.get(alias) ?? [];
      if (stack.length < 2) {
        throw new Error(`"${alias}" has no previous version to roll back to`);
      }
      stack.pop();
      const restored = stack[stack.length - 1];
      pin(alias, restored);
      return restored;
    },
    history(alias) {
      return [...(histories.get(alias) ?? [])];
    },
  };
}

export async function generateWithAlias(registry: ModelRegistry, alias: string, request: GenerateRequest, onWarning: (warning: string) => void = () => {}): Promise<GenerateResponse> {
  const { versionId, warnings } = registry.resolve(alias);
  warnings.forEach(onWarning);
  return createModel({ model: versionId }).generate(request);
}
