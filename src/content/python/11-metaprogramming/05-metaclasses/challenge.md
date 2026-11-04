Write three metaclasses in `main.py`. Each one enforces a rule on the classes it builds, and every check happens **when the class statement runs**, not when an instance is created.

## `class RequiresNameMeta(type)`

Every class built with it, including subclasses, must define `name` **in its own body** as a non-empty `str`. Otherwise the class statement raises `TypeError` whose message contains the class name. A `name` inherited from a parent does not count, so `class Rollback(Command): pass` fails.

## `class SingletonMeta(type)`

Controls what calling the class does.

- The first call creates the instance as usual (`__new__`, then `__init__`) and returns it.
- Every later call returns that same object **without running `__init__` again**; its arguments are ignored.
- Each class has its own instance: a subclass of a singleton class gets an instance of the subclass, not the parent's.

## `class FinalMeta(type)`

A class built with it cannot be subclassed. A class statement whose bases include a `FinalMeta` class raises `TypeError` naming that base. The final class itself works normally.

## Combining them

`SingletonMeta` and `FinalMeta` must stay unrelated, so a class inheriting from a singleton class and a final class fails with Python's `TypeError: metaclass conflict`. A metaclass that derives from both, `class SingletonFinalMeta(SingletonMeta, FinalMeta)`, must give its classes both behaviors, so every metaclass method you write calls `super()` with all its arguments.
