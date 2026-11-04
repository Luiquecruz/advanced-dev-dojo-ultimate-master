from datetime import datetime, timedelta, timezone

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

    def register(self, asset):
        # TODO: reject duplicate ids, unknown kinds, missing or blank owners and api-keys without "expiresAt"; store and return copies
        self._assets[asset["id"]] = asset
        return asset

    def get(self, asset_id):
        return self._assets.get(asset_id)

    def list(self, kind=None):
        return [asset for asset in self._assets.values() if kind is None or asset["kind"] == kind]

    def transfer_ownership(self, asset_id, owner):
        # TODO: set the owner of a known asset and return a copy; raise for an unknown id
        raise NotImplementedError

    def retire(self, asset_id, at):
        # TODO: set "retiredAt" of a known asset and return a copy; raise for an unknown id
        raise NotImplementedError


def create_registry():
    return Registry()


def audit_inventory(assets, people, *, now, stale_after_days=90, expiring_within_days=14):
    # TODO: skip retired assets; flag orphaned owners, expired and expiring credentials, stale keys and agents; sort by issue then asset id
    return [
        {"assetId": asset["id"], "issue": "expired", "detail": f"expired on {asset['expiresAt']}"}
        for asset in assets
        if asset.get("expiresAt") and parse_time_ms(asset["expiresAt"]) <= now
    ]


def log_entry_from(response, *, key_id, source, timestamp, agent_id=None):
    # TODO: build a gateway log entry from the model the provider reports and its token usage
    raise NotImplementedError


def detect_shadow_ai(assets, log):
    # TODO: aggregate unregistered keys, models and agents, and use of retired assets, into signals sorted by calls
    ids = {asset["id"] for asset in assets}
    return [
        {"kind": "unregistered-key", "value": entry["keyId"], "calls": 1, "totalTokens": entry["totalTokens"], "sources": [entry["source"]]}
        for entry in log
        if entry["keyId"] not in ids
    ]
