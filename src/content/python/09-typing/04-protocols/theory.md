A **protocol** describes a shape: the methods and attributes an object must have. Any class with that shape matches, whether or not it inherits from the protocol. This is **structural subtyping**, or static duck typing (PEP 544, Python 3.8).

```py
from typing import Protocol, runtime_checkable

@runtime_checkable
class Sender(Protocol):
    def send(self, message: str) -> None: ...

class EmailClient:                   # no base class
    def send(self, message: str) -> None:
        print("email:", message)

def notify(channel: Sender) -> None:
    channel.send("deploy finished")

notify(EmailClient())                       # a checker accepts it: the shape matches
print(isinstance(EmailClient(), Sender))    # True, only because of @runtime_checkable
```

## Coming from TypeScript and JavaScript

A TypeScript `interface` is structural everywhere, and it disappears at runtime:

```ts
interface Sender { send(message: string): void; }
class EmailClient { send(message: string) { console.log(message); } }
const channel: Sender = new EmailClient();   // fine: same shape
// channel instanceof Sender                 // error: Sender only exists for the compiler
```

Python flips both defaults, and two habits break:

- **Plain classes and ABCs are nominal.** `isinstance(x, Base)` is true only when `x`'s class inherits from `Base` (or is registered with an ABC). Writing a base class or an `ABC` for "anything with `close()`" and checking `isinstance` rejects every third-party object that has the method but not the base.
- **A protocol is not checkable by default.** `isinstance(x, Sender)` without `@runtime_checkable` raises `TypeError: Instance and class checks can only be used with @runtime_checkable protocols`. The decorator opts into a runtime check; a checker does not need it.

## How it works

- `class P(Protocol)` collects its members: methods, and attributes annotated in the body. `typing.get_protocol_members(P)` returns them as a frozenset and `typing.is_protocol(P)` tells a protocol from a class that merely inherits from one (both added in 3.13).
- `@runtime_checkable` makes `isinstance` check that every member **exists** on the object (looked up with `inspect.getattr_static` since 3.12, so `__getattr__` tricks do not count). It does not check signatures or types: a `send(self)` without the `message` parameter still passes `isinstance`, and only a checker catches it.
- `issubclass(C, P)` works for protocols with methods only; a protocol with data members such as `name: str` raises `TypeError` there.
- Protocols cannot be instantiated (`TypeError: Protocols cannot be instantiated`). A class that **does** inherit from a protocol becomes an ordinary class that can reuse default method bodies.
- The standard library is full of protocols: `typing.SupportsInt`, `SupportsIndex`, and the `collections.abc` ABCs such as `Iterable`, `Sized` and `Hashable`, whose `__subclasshook__` makes `isinstance` structural for one method.

### Protocol or ABC?

| | `Protocol` | `ABC` with `@abstractmethod` |
| --- | --- | --- |
| Implementers must inherit | No | Yes (or `register`) |
| Missing method detected | By the checker; at runtime only by `isinstance` presence | At instantiation, `TypeError` |
| Shared default methods | Only for classes that inherit explicitly | Yes, that is the point |
| Best for | Describing what a function **consumes** | A base class that you **own** and extend |

Pitfalls:

- `isinstance` against a runtime protocol is slower than against a class: it checks every member on every call. Avoid it in hot loops.
- A member set to `None` on the class counts as missing; a member that is a non-callable value counts as present.

## When to choose it

- **`Protocol`** for parameters that accept "anything with these methods", especially objects written by other teams or libraries: plugins, callbacks, file-like objects.
- **`@runtime_checkable`** only when code must branch on the shape at runtime (a registry that skips non-conforming plugins). Remember it checks presence, not signatures.
- **`ABC`** when you own the hierarchy and want shared implementation or instantiation-time errors.
- **No protocol** for one concrete type you control; a plain annotation with the class is simpler.
