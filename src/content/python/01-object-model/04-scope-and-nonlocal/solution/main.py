def make_counter(start=0, step=1):
    current = start

    def next_value():
        nonlocal current
        value = current
        current += step
        return value

    def reset():
        nonlocal current
        current = start

    return next_value, reset


def make_history(limit):
    values = []

    def record(value):
        values.append(value)
        excess = len(values) - limit
        if excess > 0:
            del values[:excess]

    def entries():
        return tuple(values)

    return record, entries
