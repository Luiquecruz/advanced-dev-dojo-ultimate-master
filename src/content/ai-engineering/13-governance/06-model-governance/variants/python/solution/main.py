import math
from datetime import datetime, timedelta, timezone

from dojo_ai import create_model

DAY_MS = 24 * 60 * 60 * 1000
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


def parse_time_ms(text):
    moment = datetime.fromisoformat(text)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return (moment - EPOCH) // timedelta(milliseconds=1)


class ModelRegistry:
    """Pins aliases to approved model versions, gated by eval results, with deprecation warnings and rollback."""

    def __init__(self, now, allowed_licenses, warn_within_days):
        self._now = now
        self._allowed_licenses = allowed_licenses
        self._warn_within_days = warn_within_days
        self._versions = {}
        self._scores = {}
        self._pins = {}
        self._histories = {}

    def _is_retired(self, version):
        return version.get("retiresAt") is not None and parse_time_ms(version["retiresAt"]) <= self._now()

    def _current(self, alias):
        stack = self._pins.get(alias)
        return stack[-1] if stack else None

    def register(self, version):
        if version["id"] in self._versions:
            raise ValueError(f'Model version "{version["id"]}" is already registered')
        if version["id"].lower().endswith("latest"):
            raise ValueError(f'"{version["id"]}" is a floating alias; register a pinned, dated version')
        if version["license"] not in self._allowed_licenses:
            raise ValueError(f'License "{version["license"]}" of "{version["id"]}" is not approved')
        self._versions[version["id"]] = dict(version)
        self._scores[version["id"]] = {}

    def record_eval(self, version_id, suite, score):
        if version_id not in self._scores:
            raise KeyError(f'Unknown model version "{version_id}"')
        self._scores[version_id][suite] = score

    def promote(self, alias, version_id, gate):
        version = self._versions.get(version_id)
        if version is None:
            return {"promoted": False, "reasons": ["unknown-version"]}
        reasons = []
        if self._is_retired(version):
            reasons.append("retired")
        candidate = self._scores[version_id]
        previous = self._current(alias)
        baseline = {} if previous is None else self._scores[previous]
        for suite, minimum in gate["minimums"].items():
            score = candidate.get(suite)
            if score is None:
                reasons.append(f"missing-eval:{suite}")
                continue
            if score < minimum:
                reasons.append(f"below-minimum:{suite}")
            baseline_score = baseline.get(suite)
            if baseline_score is not None and score < baseline_score - gate["maxRegression"]:
                reasons.append(f"regression:{suite}")
        if reasons:
            return {"promoted": False, "reasons": reasons}
        self._pins.setdefault(alias, []).append(version_id)
        self._histories.setdefault(alias, []).append(version_id)
        result = {"promoted": True, "alias": alias, "versionId": version_id}
        if previous is not None:
            result["previous"] = previous
        return result

    def resolve(self, alias):
        version_id = self._current(alias)
        if version_id is None:
            raise KeyError(f'Unknown alias "{alias}"')
        version = self._versions[version_id]
        if self._is_retired(version):
            raise RuntimeError(f'"{alias}" is pinned to {version_id}, which retired on {version["retiresAt"]}')
        warnings = []
        if version.get("retiresAt") is not None:
            remaining = parse_time_ms(version["retiresAt"]) - self._now()
            if remaining <= self._warn_within_days * DAY_MS:
                days = math.ceil(remaining / DAY_MS)
                replacement = version.get("replacement") or "a replacement that is not registered yet"
                warnings.append(f"{version_id} retires on {version['retiresAt']} (in {days} days); migrate to {replacement}")
        return {"versionId": version_id, "warnings": warnings}

    def rollback(self, alias):
        stack = self._pins.get(alias, [])
        if len(stack) < 2:
            raise RuntimeError(f'"{alias}" has no previous version to roll back to')
        stack.pop()
        restored = stack[-1]
        self._histories[alias].append(restored)
        return restored

    def history(self, alias):
        return list(self._histories.get(alias, []))


def create_model_registry(*, now, allowed_licenses, warn_within_days=30):
    return ModelRegistry(now, allowed_licenses, warn_within_days)


async def generate_with_alias(registry, alias, request, on_warning=None):
    resolution = registry.resolve(alias)
    for warning in resolution["warnings"]:
        if on_warning is not None:
            on_warning(warning)
    return await create_model(resolution["versionId"]).generate(request)
