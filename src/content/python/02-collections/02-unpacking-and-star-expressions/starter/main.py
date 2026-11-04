def split_ends(items):
    # TODO: use one unpacking assignment with a starred target; it must work for generators too.
    return items[0], items[1:-1], items[-1]


def merge_layers(*layers, **overrides):
    # TODO: build a new dict; do not modify any layer.
    merged = layers[0]
    for layer in layers[1:]:
        merged.update(layer)
    merged.update(overrides)
    return merged


def swap_pairs(pairs):
    # TODO: unpack each pair instead of indexing.
    return list(pairs)
