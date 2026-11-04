def split_ends(items):
    first, *middle, last = items
    return first, middle, last


def merge_layers(*layers, **overrides):
    return {**{key: value for layer in layers for key, value in layer.items()}, **overrides}


def swap_pairs(pairs):
    return [(second, first) for first, second in pairs]
