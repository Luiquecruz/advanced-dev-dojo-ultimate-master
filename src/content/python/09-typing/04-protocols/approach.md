1. For each check in the starter, ask whether it is nominal (inheritance, a concrete class, an ABC) or structural (a shape).
2. Write both protocols as `Protocol` subclasses with one stub method each and decide which runtime checks the contract needs; add `@runtime_checkable` for those.
3. Remove the protocol from `Badge`'s bases and confirm with `Renderable in Badge.__mro__` that it no longer inherits, while `isinstance` still matches.
4. Make `render_all` and `close_all` branch on the protocols, and try them with objects from another "team": classes defined in a test or the demo that share only the method name.
5. Check the limits: `typing.get_protocol_members` lists the members, `Renderable()` raises `TypeError`, and an object whose `render` has the wrong signature would still pass `isinstance`, which is why a checker is still worth running.
