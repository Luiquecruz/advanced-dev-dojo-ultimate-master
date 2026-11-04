def add_item(cart, item):
    cart.append(item)
    return cart


def snapshot(cart):
    return list(cart)


def merge_carts(first, second):
    return [*first, *second]


def empty_carts(count):
    return [[] for _ in range(count)]
