from datetime import datetime, timedelta, timezone

DAY_MS = 24 * 60 * 60 * 1000
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)
CONDITION_KEYS = ["uses", "dataTypes", "users"]


def parse_time_ms(text):
    moment = datetime.fromisoformat(text)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return (moment - EPOCH) // timedelta(milliseconds=1)


def covers_market(jurisdiction, markets):
    return any(market == jurisdiction or market.startswith(f"{jurisdiction}-") for market in markets)


def matches_feature(when, feature):
    return all(
        key not in when or any(value in feature[key] for value in when[key])
        for key in CONDITION_KEYS
    )


def status_of(rule, as_of):
    if rule["status"] == "bill":
        return "proposed"
    if "appliesFrom" in rule and parse_time_ms(rule["appliesFrom"]) > parse_time_ms(as_of):
        return "upcoming"
    return "applies"


def map_obligations(profile, rules, as_of):
    obligations = []
    for rule in rules:
        if not covers_market(rule["jurisdiction"], profile["markets"]):
            continue
        for feature in profile["features"]:
            if not matches_feature(rule["when"], feature):
                continue
            obligation = {
                "ruleId": rule["id"],
                "jurisdiction": rule["jurisdiction"],
                "instrument": rule["instrument"],
                "featureId": feature["id"],
                "obligation": rule["obligation"],
                "status": status_of(rule, as_of),
            }
            if "appliesFrom" in rule:
                obligation["appliesFrom"] = rule["appliesFrom"]
            obligations.append(obligation)
    return sorted(obligations, key=lambda obligation: (obligation["jurisdiction"], obligation["ruleId"], obligation["featureId"]))


def summarize(obligations):
    summary = {}
    for obligation in obligations:
        counts = summary.setdefault(obligation["jurisdiction"], {"applies": 0, "upcoming": 0, "proposed": 0})
        counts[obligation["status"]] += 1
    return summary


def check_freshness(rules_as_of, as_of, max_age_days=92):
    age_days = (parse_time_ms(as_of) - parse_time_ms(rules_as_of)) // DAY_MS
    return {"fresh": age_days <= max_age_days, "ageDays": age_days}
