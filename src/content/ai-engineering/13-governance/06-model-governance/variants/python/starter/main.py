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
        self._aliases = {}

    def register(self, version):
        # TODO: reject duplicates, floating "latest" ids and unapproved licenses
        self._versions[version["id"]] = version

    def record_eval(self, version_id, suite, score):
        # TODO: record (or replace) the score of a known version; raise for an unknown version
        pass

    def promote(self, alias, version_id, gate):
        # TODO: unknown-version, retired, missing-eval, below-minimum and regression against the current pin; keep a pin stack and a history per alias
        self._aliases[alias] = version_id
        return {"promoted": True, "alias": alias, "versionId": version_id}

    def resolve(self, alias):
        # TODO: raise when the pinned version retired; warn with the days left and the replacement within warn_within_days
        version_id = self._aliases.get(alias)
        if version_id is None:
            raise KeyError(f'Unknown alias "{alias}"')
        return {"versionId": version_id, "warnings": []}

    def rollback(self, alias):
        # TODO: re-pin the version pinned before the current one and return its id; raise when there is none
        raise NotImplementedError

    def history(self, alias):
        # TODO: every version the alias was pinned to, in order, including rollbacks
        return []


def create_model_registry(*, now, allowed_licenses, warn_within_days=30):
    return ModelRegistry(now, allowed_licenses, warn_within_days)


async def generate_with_alias(registry, alias, request, on_warning=None):
    # TODO: resolve the alias, report its warnings, and call the pinned version
    return await create_model().generate(request)
