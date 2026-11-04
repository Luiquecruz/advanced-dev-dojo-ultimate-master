def add_item(cart, item):
    # TODO: mutate the list passed in and return that same list.
    cart = cart + [item]
    return cart


def snapshot(cart):
    # TODO: return a new list so later changes to the cart are not visible.
    return cart


def merge_carts(first, second):
    # TODO: return a new list without modifying either input.
    first += second
    return first


def empty_carts(count):
    # TODO: return `count` independent empty lists.
    return [[]] * count
