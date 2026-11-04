A dashboard renders widgets and, when it shuts down, closes the resources it holds. Widgets and resources come from several teams, so `main.py` must accept any object with the right method, whatever its base class. The starter uses nominal checks; make them structural.

## `class Renderable(Protocol)`

- One method: `render(self) -> str`.
- Runtime-checkable: `isinstance(obj, Renderable)` works and is `True` for any object whose class defines `render`.
- `typing.get_protocol_members(Renderable) == frozenset({"render"})`.

## `class Closeable(Protocol)`

- One method: `close(self) -> None`; runtime-checkable as well; members `frozenset({"close"})`.
- Objects with a `close` method match without inheriting from anything.

## `class Badge(label)`

`render()` returns the label in brackets (`Badge("new").render() == "[new]"`). It matches `Renderable` **without** inheriting from it: `Renderable` is not in `Badge.__mro__`, yet `isinstance(Badge("x"), Renderable)` and `issubclass(Badge, Renderable)` are `True`.

## `render_all(items)`

Returns a list with `item.render()` for every item that satisfies `Renderable`, in order, skipping everything else (strings, numbers, objects without `render`).

## `close_all(resources)`

Calls `close()` once on every resource that satisfies `Closeable`, in order, skips the others, and returns how many it closed.

Neither protocol can be instantiated: `Renderable()` and `Closeable()` raise `TypeError`.
