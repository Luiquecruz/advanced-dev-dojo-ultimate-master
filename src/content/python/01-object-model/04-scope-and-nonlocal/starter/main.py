def make_counter(start=0, step=1):
    current = start

    def next_value():
        # TODO: declare the variable nonlocal, return the current value, then advance it by `step`.
        value = current
        current += step
        return value

    def reset():
        # TODO: set the counter back to `start`.
        pass

    return next_value, reset


def make_history(limit):
    values = []

    def record(value):
        # TODO: keep only the last `limit` values.
        values.append(value)

    def entries():
        # TODO: return the stored values as a tuple, oldest first.
        return values

    return record, entries
