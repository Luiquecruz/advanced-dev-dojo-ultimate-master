def split_ends(items):
    first, *middle, last = items
    return first, middle, last


def merge_layers(*layers, **overrides):
    merged = {}
    for layer in layers:
        merged = {**merged, **layer}
    return {**merged, **overrides}


def swap_pairs(pairs):
    return [(second, first) for first, second in pairs]
