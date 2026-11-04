from typing import TypeAliasType, get_args, get_origin


def numbers():
    yield 0
    yield 1


@test("first returns the first item of any iterable, even a falsy one, or the default")
def _():
    params = mod.first.__type_params__
    from_list = mod.first(["a", "b"])
    falsy = mod.first([0, 5], default=9)
    from_generator = mod.first(numbers(), default=9)
    empty = mod.first([])
    fallback = mod.first([], default="none")
    assert len(params) == 1
    assert from_list == "a"
    assert falsy == 0
    assert from_generator == 0
    assert empty is None
    assert fallback == "none"


@test("Stack pops and peeks in last-in first-out order and signals an empty stack")
async def _():
    stack = mod.Stack()
    stack.push(1)
    stack.push(2)
    top = stack.peek()
    popped = [stack.pop(), stack.pop()]
    empty_peek = stack.peek()
    size = len(stack)
    assert top == 2
    assert popped == [2, 1]
    assert empty_peek is None
    assert size == 0
    error = await capture_error(lambda: stack.pop())
    assert isinstance(error, IndexError)


@test("Stack declares one type parameter and Stack[int] builds an ordinary, unchecked instance")
def _():
    params = mod.Stack.__type_params__
    ints = mod.Stack[int]()
    other = mod.Stack()
    ints.push("not checked at runtime")
    assert len(params) == 1
    assert type(ints) is mod.Stack
    assert len(ints) == 1
    assert len(other) == 0


@test("Pair is a type alias over one parameter whose value is a tuple of two of it")
def _():
    alias = mod.Pair
    assert isinstance(alias, TypeAliasType)
    params = alias.__type_params__
    assert len(params) == 1
    value = alias.__value__
    origin = get_origin(value)
    args = get_args(value)
    assert origin is tuple
    assert args == (params[0], params[0])
    swapped = mod.swap((1, 2))
    assert swapped == (2, 1)


@test("Box's type parameter is constrained to exactly int or str")
def _():
    params = mod.Box.__type_params__
    assert len(params) == 1
    constraints = params[0].__constraints__
    bound = params[0].__bound__
    assert constraints == (int, str)
    assert bound is None
    number = mod.Box(21).doubled()
    text = mod.Box("ab").doubled()
    assert number == 42
    assert text == "abab"
