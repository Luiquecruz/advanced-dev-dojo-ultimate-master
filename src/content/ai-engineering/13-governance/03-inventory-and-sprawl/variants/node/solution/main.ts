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

const ASSET_KINDS: AssetKind[] = ['model', 'agent', 'prompt', 'mcp-server', 'api-key'];
const ISSUE_ORDER: FindingIssue[] = ['orphaned', 'expired', 'expiring', 'stale'];
const DAY_MS = 24 * 60 * 60 * 1000;

export function createRegistry(): Registry {
  const assets = new Map<string, Asset>();

  function find(id: string): Asset {
    const asset = assets.get(id);
    if (!asset) {
      throw new Error(`Unknown asset "${id}"`);
    }
    return asset;
  }

  return {
    register(asset) {
      if (assets.has(asset.id)) {
        throw new Error(`Asset "${asset.id}" is already registered`);
      }
      if (!ASSET_KINDS.includes(asset.kind)) {
        throw new Error(`Unknown asset kind "${asset.kind}"`);
      }
      if (!asset.owner || asset.owner.trim() === '') {
        throw new Error(`Asset "${asset.id}" needs an owner`);
      }
      if (asset.kind === 'api-key' && !asset.expiresAt) {
        throw new Error(`Credential "${asset.id}" needs an expiry date`);
      }
      assets.set(asset.id, { ...asset });
      return { ...asset };
    },
    get(id) {
      const asset = assets.get(id);
      return asset ? { ...asset } : undefined;
    },
    list(kind) {
      return [...assets.values()].filter((asset) => kind === undefined || asset.kind === kind).map((asset) => ({ ...asset }));
    },
    transferOwnership(id, owner) {
      if (owner.trim() === '') {
        throw new Error(`Asset "${id}" needs an owner`);
      }
      const updated = { ...find(id), owner };
      assets.set(id, updated);
      return { ...updated };
    },
    retire(id, at) {
      const updated = { ...find(id), retiredAt: at };
      assets.set(id, updated);
      return { ...updated };
    },
  };
}

export function auditInventory(assets: Asset[], people: Person[], { now, staleAfterDays = 90, expiringWithinDays = 14 }: AuditOptions): Finding[] {
  const activePeople = new Set(people.filter((person) => person.active).map((person) => person.id));
  const findings: Finding[] = [];
  for (const asset of assets) {
    if (asset.retiredAt) {
      continue;
    }
    if (!activePeople.has(asset.owner)) {
      findings.push({ assetId: asset.id, issue: 'orphaned', detail: `owner "${asset.owner}" is not an active person` });
    }
    if (asset.expiresAt) {
      const expiresAt = Date.parse(asset.expiresAt);
      if (expiresAt <= now) {
        findings.push({ assetId: asset.id, issue: 'expired', detail: `expired on ${asset.expiresAt}` });
      } else if (expiresAt - now <= expiringWithinDays * DAY_MS) {
        findings.push({ assetId: asset.id, issue: 'expiring', detail: `expires in ${Math.ceil((expiresAt - now) / DAY_MS)} days` });
      }
    }
    if (asset.kind === 'api-key' || asset.kind === 'agent') {
      const lastActivity = Date.parse(asset.lastUsedAt ?? asset.createdAt);
      const idleDays = Math.floor((now - lastActivity) / DAY_MS);
      if (now - lastActivity > staleAfterDays * DAY_MS) {
        findings.push({ assetId: asset.id, issue: 'stale', detail: asset.lastUsedAt ? `unused for ${idleDays} days` : `never used in ${idleDays} days` });
      }
    }
  }
  return findings.sort((left, right) => ISSUE_ORDER.indexOf(left.issue) - ISSUE_ORDER.indexOf(right.issue) || left.assetId.localeCompare(right.assetId));
}

export function logEntryFrom(response: GenerateResponse, context: { keyId: string; agentId?: string; source: string; timestamp: string }): GatewayLogEntry {
  const entry: GatewayLogEntry = { timestamp: context.timestamp, keyId: context.keyId, model: response.model, source: context.source, totalTokens: response.usage.totalTokens };
  if (context.agentId !== undefined) {
    entry.agentId = context.agentId;
  }
  return entry;
}

export function detectShadowAi(assets: Asset[], log: GatewayLogEntry[]): ShadowSignal[] {
  const keys = new Map(assets.filter((asset) => asset.kind === 'api-key').map((asset) => [asset.id, asset]));
  const models = new Map(assets.filter((asset) => asset.kind === 'model').map((asset) => [asset.name, asset]));
  const agents = new Map(assets.filter((asset) => asset.kind === 'agent').map((asset) => [asset.id, asset]));
  const signals = new Map<string, ShadowSignal>();

  function add(kind: SignalKind, value: string, entry: GatewayLogEntry) {
    const key = `${kind}:${value}`;
    const signal = signals.get(key) ?? { kind, value, calls: 0, totalTokens: 0, sources: [] };
    signal.calls += 1;
    signal.totalTokens += entry.totalTokens;
    if (!signal.sources.includes(entry.source)) {
      signal.sources.push(entry.source);
    }
    signals.set(key, signal);
  }

  function check(registered: Map<string, Asset>, value: string, unregisteredKind: SignalKind, entry: GatewayLogEntry) {
    const asset = registered.get(value);
    if (!asset) {
      add(unregisteredKind, value, entry);
    } else if (asset.retiredAt) {
      add('retired-asset', asset.id, entry);
    }
  }

  for (const entry of log) {
    check(keys, entry.keyId, 'unregistered-key', entry);
    check(models, entry.model, 'unregistered-model', entry);
    if (entry.agentId !== undefined) {
      check(agents, entry.agentId, 'unregistered-agent', entry);
    }
  }
  return [...signals.values()]
    .map((signal) => ({ ...signal, sources: [...signal.sources].sort() }))
    .sort((left, right) => right.calls - left.calls || right.totalTokens - left.totalTokens || left.value.localeCompare(right.value));
}
