def access_report(roles, user_roles, needed):
    # TODO: return four SETS: granted (union), common (intersection of all the user's roles),
    # missing (needed - granted) and unused (granted - needed). Do not modify the inputs.
    granted = []
    for name in user_roles:
        granted.extend(roles[name])
    return {"granted": granted, "common": [], "missing": [], "unused": []}


def dedupe_keep_order(items):
    # TODO: remove duplicates keeping the first occurrence; unhashable items raise TypeError.
    return list(set(items))


def unique_ids(*iterables):
    # TODO: a set with every item of every iterable.
    return [item for iterable in iterables for item in iterable]
