def access_report(roles, user_roles, needed):
    permission_sets = [roles[name] for name in user_roles]
    granted = set().union(*permission_sets)
    common = set.intersection(*permission_sets) if permission_sets else set()
    return {
        "granted": granted,
        "common": common,
        "missing": needed - granted,
        "unused": granted - needed,
    }


def dedupe_keep_order(items):
    return list(dict.fromkeys(items))


def unique_ids(*iterables):
    return set().union(*iterables)
