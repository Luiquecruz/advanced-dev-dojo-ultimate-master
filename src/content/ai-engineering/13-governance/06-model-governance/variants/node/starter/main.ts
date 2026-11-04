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

// TODO: reject duplicates, floating "latest" ids and unapproved licenses; gate promotion on evals and regressions; warn before retirement; keep a pin history for rollback
export function createModelRegistry({ now, allowedLicenses, warnWithinDays = 30 }: RegistryOptions): ModelRegistry {
  const versions = new Map<string, ModelVersion>();
  const aliases = new Map<string, string>();
  return {
    register(version) {
      versions.set(version.id, version);
    },
    recordEval(versionId, suite, score) {},
    promote(alias, versionId, gate) {
      aliases.set(alias, versionId);
      return { promoted: true, alias, versionId };
    },
    resolve(alias) {
      const versionId = aliases.get(alias);
      if (!versionId) {
        throw new Error(`Unknown alias "${alias}"`);
      }
      return { versionId, warnings: [] };
    },
    rollback(alias) {
      throw new Error('Not implemented');
    },
    history(alias) {
      return [];
    },
  };
}

// TODO: resolve the alias, report its warnings, and call the pinned version
export async function generateWithAlias(registry: ModelRegistry, alias: string, request: GenerateRequest, onWarning: (warning: string) => void = () => {}): Promise<GenerateResponse> {
  return createModel().generate(request);
}
