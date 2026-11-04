from datetime import datetime, timedelta, timezone

DAY_MS = 24 * 60 * 60 * 1000
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


def parse_time_ms(text):
    moment = datetime.fromisoformat(text)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return (moment - EPOCH) // timedelta(milliseconds=1)


def covers_market(jurisdiction, markets):
    # TODO: a jurisdiction covers a market with the same code or a sub-market such as US-CA for US
    return jurisdiction in markets


def matches_feature(when, feature):
    # TODO: every key the condition sets must share at least one value with the feature; an empty condition matches every feature
    return any(use in feature["uses"] for use in when.get("uses", []))


def map_obligations(profile, rules, as_of):
    # TODO: one obligation per matching rule and feature, with status applies, upcoming or proposed, sorted by jurisdiction, rule and feature
    obligations = []
    for rule in rules:
        if not covers_market(rule["jurisdiction"], profile["markets"]):
            continue
        for feature in profile["features"]:
            if matches_feature(rule["when"], feature):
                obligations.append(
                    {
                        "ruleId": rule["id"],
                        "jurisdiction": rule["jurisdiction"],
                        "instrument": rule["instrument"],
                        "featureId": feature["id"],
                        "obligation": rule["obligation"],
                        "status": "applies",
                    }
                )
    return obligations


def summarize(obligations):
    # TODO: count obligations per jurisdiction and status
    raise NotImplementedError


def check_freshness(rules_as_of, as_of, max_age_days=92):
    # TODO: age of the rules table in whole days, fresh while at most max_age_days
    return {"fresh": True, "ageDays": 0}
