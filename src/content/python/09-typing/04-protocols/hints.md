`isinstance` against a protocol needs `@runtime_checkable` from `typing` on the protocol class. Without it, the check raises `TypeError` instead of answering.
---
An `ABC` is nominal: a `Connection` class with a `close` method is not an instance unless it inherits from it. Write `Closeable` the same way as `Renderable`: a `Protocol` subclass with one method stub (`...` as the body).
---
Remove `Renderable` from `Badge`'s bases; the method alone makes it match. In `render_all`, check against the protocol, not against `Badge`, so any team's widget is rendered.
