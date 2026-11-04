import math
from datetime import datetime, timedelta, timezone

ASSET_KINDS = ["model", "agent", "prompt", "mcp-server", "api-key"]
ISSUE_ORDER = ["orphaned", "expired", "expiring", "stale"]
DAY_MS = 24 * 60 * 60 * 1000
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


def parse_time_ms(text):
    moment = datetime.fromisoformat(text)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return (moment - EPOCH) // timedelta(milliseconds=1)


class Registry:
    """Stores AI assets by id and hands out copies, so only its own methods change them."""

    def __init__(self):
        self._assets = {}

    def _find(self, asset_id):
        if asset_id not in self._assets:
            raise KeyError(f'Unknown asset "{asset_id}"')
        return self._assets[asset_id]

    def register(self, asset):
        if asset["id"] in self._assets:
            raise ValueError(f'Asset "{asset["id"]}" is already registered')
        if asset["kind"] not in ASSET_KINDS:
            raise ValueError(f'Unknown asset kind "{asset["kind"]}"')
        if not asset.get("owner") or asset["owner"].strip() == "":
            raise ValueError(f'Asset "{asset["id"]}" needs an owner')
        if asset["kind"] == "api-key" and not asset.get("expiresAt"):
            raise ValueError(f'Credential "{asset["id"]}" needs an expiry date')
        self._assets[asset["id"]] = dict(asset)
        return dict(asset)

    def get(self, asset_id):
        asset = self._assets.get(asset_id)
        return None if asset is None else dict(asset)

    def list(self, kind=None):
        return [dict(asset) for asset in self._assets.values() if kind is None or asset["kind"] == kind]

    def transfer_ownership(self, asset_id, owner):
        if owner.strip() == "":
            raise ValueError(f'Asset "{asset_id}" needs an owner')
        updated = {**self._find(asset_id), "owner": owner}
        self._assets[asset_id] = updated
        return dict(updated)

    def retire(self, asset_id, at):
        updated = {**self._find(asset_id), "retiredAt": at}
        self._assets[asset_id] = updated
        return dict(updated)


def create_registry():
    return Registry()


def audit_inventory(assets, people, *, now, stale_after_days=90, expiring_within_days=14):
    active_people = {person["id"] for person in people if person["active"]}
    findings = []
    for asset in assets:
        if asset.get("retiredAt"):
            continue
        if asset["owner"] not in active_people:
            findings.append({"assetId": asset["id"], "issue": "orphaned", "detail": f'owner "{asset["owner"]}" is not an active person'})
        if asset.get("expiresAt"):
            expires_at = parse_time_ms(asset["expiresAt"])
            if expires_at <= now:
                findings.append({"assetId": asset["id"], "issue": "expired", "detail": f"expired on {asset['expiresAt']}"})
            elif expires_at - now <= expiring_within_days * DAY_MS:
                findings.append({"assetId": asset["id"], "issue": "expiring", "detail": f"expires in {math.ceil((expires_at - now) / DAY_MS)} days"})
        if asset["kind"] in ("api-key", "agent"):
            last_activity = parse_time_ms(asset.get("lastUsedAt") or asset["createdAt"])
            idle_days = (now - last_activity) // DAY_MS
            if now - last_activity > stale_after_days * DAY_MS:
                detail = f"unused for {idle_days} days" if asset.get("lastUsedAt") else f"never used in {idle_days} days"
                findings.append({"assetId": asset["id"], "issue": "stale", "detail": detail})
    return sorted(findings, key=lambda finding: (ISSUE_ORDER.index(finding["issue"]), finding["assetId"]))


def log_entry_from(response, *, key_id, source, timestamp, agent_id=None):
    entry = {"timestamp": timestamp, "keyId": key_id, "model": response["model"], "source": source, "totalTokens": response["usage"]["totalTokens"]}
    if agent_id is not None:
        entry["agentId"] = agent_id
    return entry


def detect_shadow_ai(assets, log):
    keys = {asset["id"]: asset for asset in assets if asset["kind"] == "api-key"}
    models = {asset["name"]: asset for asset in assets if asset["kind"] == "model"}
    agents = {asset["id"]: asset for asset in assets if asset["kind"] == "agent"}
    signals = {}

    def add(kind, value, entry):
        signal = signals.setdefault((kind, value), {"kind": kind, "value": value, "calls": 0, "totalTokens": 0, "sources": []})
        signal["calls"] += 1
        signal["totalTokens"] += entry["totalTokens"]
        if entry["source"] not in signal["sources"]:
            signal["sources"].append(entry["source"])

    def check(registered, value, unregistered_kind, entry):
        asset = registered.get(value)
        if asset is None:
            add(unregistered_kind, value, entry)
        elif asset.get("retiredAt"):
            add("retired-asset", asset["id"], entry)

    for entry in log:
        check(keys, entry["keyId"], "unregistered-key", entry)
        check(models, entry["model"], "unregistered-model", entry)
        if entry.get("agentId") is not None:
            check(agents, entry["agentId"], "unregistered-agent", entry)
    aggregated = [{**signal, "sources": sorted(signal["sources"])} for signal in signals.values()]
    return sorted(aggregated, key=lambda signal: (-signal["calls"], -signal["totalTokens"], signal["value"]))
