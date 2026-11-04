import type { GenerateResponse } from '@dojo/ai';

export type AssetKind = 'model' | 'agent' | 'prompt' | 'mcp-server' | 'api-key';

export interface Asset {
  id: string;
  kind: AssetKind;
  name: string;
  owner: string;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  retiredAt?: string;
}

export interface Person {
  id: string;
  active: boolean;
}

export interface GatewayLogEntry {
  timestamp: string;
  keyId: string;
  model: string;
  agentId?: string;
  source: string;
  totalTokens: number;
}

export type FindingIssue = 'orphaned' | 'expired' | 'expiring' | 'stale';

export interface Finding {
  assetId: string;
  issue: FindingIssue;
  detail: string;
}

export type SignalKind = 'unregistered-key' | 'unregistered-model' | 'unregistered-agent' | 'retired-asset';

export interface ShadowSignal {
  kind: SignalKind;
  value: string;
  calls: number;
  totalTokens: number;
  sources: string[];
}

export interface AuditOptions {
  now: number;
  staleAfterDays?: number;
  expiringWithinDays?: number;
}

export interface Registry {
  register(asset: Asset): Asset;
  get(id: string): Asset | undefined;
  list(kind?: AssetKind): Asset[];
  transferOwnership(id: string, owner: string): Asset;
  retire(id: string, at: string): Asset;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// TODO: reject duplicate ids, unknown kinds, missing owners and credentials without expiresAt; return copies so callers cannot edit the registry
export function createRegistry(): Registry {
  const assets = new Map<string, Asset>();
  return {
    register(asset) {
      assets.set(asset.id, asset);
      return asset;
    },
    get(id) {
      return assets.get(id);
    },
    list(kind) {
      return [...assets.values()].filter((asset) => kind === undefined || asset.kind === kind);
    },
    transferOwnership(id, owner) {
      throw new Error('Not implemented');
    },
    retire(id, at) {
      throw new Error('Not implemented');
    },
  };
}

// TODO: skip retired assets; flag orphaned owners, expired and expiring credentials, stale keys and agents; sort by issue then asset id
export function auditInventory(assets: Asset[], people: Person[], { now, staleAfterDays = 90, expiringWithinDays = 14 }: AuditOptions): Finding[] {
  return assets
    .filter((asset) => asset.expiresAt !== undefined && Date.parse(asset.expiresAt) <= now)
    .map((asset) => ({ assetId: asset.id, issue: 'expired' as const, detail: `expired on ${asset.expiresAt}` }));
}

// TODO: build a gateway log entry from the model the provider reports and its token usage
export function logEntryFrom(response: GenerateResponse, context: { keyId: string; agentId?: string; source: string; timestamp: string }): GatewayLogEntry {
  throw new Error('Not implemented');
}

// TODO: aggregate unregistered keys, models and agents, and use of retired assets, into signals sorted by calls
export function detectShadowAi(assets: Asset[], log: GatewayLogEntry[]): ShadowSignal[] {
  const keys = new Set(assets.map((asset) => asset.id));
  return log
    .filter((entry) => !keys.has(entry.keyId))
    .map((entry) => ({ kind: 'unregistered-key' as const, value: entry.keyId, calls: 1, totalTokens: entry.totalTokens, sources: [entry.source] }));
}
