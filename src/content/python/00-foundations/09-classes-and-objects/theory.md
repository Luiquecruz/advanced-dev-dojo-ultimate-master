A **class** describes a kind of object: which data each object holds and what it can do. Every object made from a class is an **instance** of it, with its own data.

```py
class Counter:
    def __init__(self, start=0):
        self.value = start          # an attribute: data stored on this instance

    def increment(self):            # a method: a function defined in the class
        self.value += 1
        return self.value


clicks = Counter()                  # calling the class creates an instance
laps = Counter(10)
clicks.increment()                  # 1
laps.increment()                    # 11
print(clicks.value, laps.value)     # 1 11
```

## How it works

**Creating an instance.** `Counter(10)` creates a new, empty object and calls `__init__` with that object as the first argument and `10` as `start`. `__init__` gives the object its starting attributes and returns nothing. Names with two underscores on each side, such as `__init__`, are methods Python calls for you; they are called *dunder* (double underscore) methods.

**`self`.** A method receives the instance it was called on as its first parameter, named `self` by convention: `clicks.increment()` runs `Counter.increment(clicks)`. Inside the method, `self.value` is *this* instance's value, which is why `clicks` and `laps` count separately. Writing `value = 0` without `self.` would only create a local variable that disappears when the method returns.

**Class attributes and instance attributes.** A name assigned in the class body belongs to the class and is shared by every instance. A name assigned through `self` belongs to one instance. Reading `instance.name` looks at the instance first, then at its class.

```py
class Shop:
    currency = "EUR"                # class attribute: the same for every shop

    def __init__(self, name):
        self.name = name            # instance attribute: one per shop
```

Constants shared by every object belong in the class body; anything that differs from one object to the next belongs in `__init__`.

**`__repr__`.** `print(clicks)` shows something like `<__main__.Counter object at 0x7f...>` unless the class defines `__repr__`, the method that returns a text describing the object. Writing it the way the object is created makes debugging easier, and `!r` in an f-string adds the quotes around strings:

```py
    def __repr__(self):
        return f"{type(self).__name__}({self.value!r})"   # Counter(1)
```

`type(self).__name__` is the name of the object's class, so a subclass shows its own name.

**Inheritance.** `class Timer(Counter):` makes a **subclass**. It gets every method of its parent, can add new ones, and can **override** a method by defining one with the same name. When the subclass needs its own `__init__`, it calls the parent's with `super().__init__(...)` so the parent still sets up its attributes:

```py
class Timer(Counter):
    def __init__(self, start=0, unit="s"):
        super().__init__(start)     # Counter.__init__ sets self.value
        self.unit = unit

    def __repr__(self):             # overrides the parent's __repr__
        return f"Timer({self.value!r}, unit={self.unit!r})"
```

`isinstance(obj, Counter)` is `True` for a `Counter` and for an instance of any of its subclasses, such as a `Timer`.

**Your own exceptions.** Exceptions are classes too. Subclass the built-in exception that fits, and callers can handle either the general case or yours:

```py
class InsufficientFunds(ValueError):
    pass
```

`except ValueError` also catches an `InsufficientFunds`; `except InsufficientFunds` catches only it. The `pass` statement is an empty body: the class needs nothing beyond what it inherits.

**A preview: more dunder methods.** Python calls `__len__` for `len(obj)` and `__eq__` for `a == b`. Without `__eq__`, two instances are equal only when they are the same object. Module 01 writes `__eq__` (identity and equality), module 02 writes `__len__` (sequence protocol), and module 04 shows when a dataclass writes them for you.

## Common mistakes

**A list in the class body.** A value assigned in the class body is created once, when Python reads the class, and every instance shares it. A list there collects the history of every account in one place:

```py
class BankAccount:
    history = []                    # wrong: one list shared by every account

    def __init__(self, owner):
        self.owner = owner


class BankAccount:
    def __init__(self, owner):
        self.owner = owner
        self.history = []           # right: a new list for each account
```

**Leaving out `self`.** `def deposit(amount):` looks right, but `account.deposit(5)` passes the instance as well and fails with `TypeError: BankAccount.deposit() takes 1 positional argument but 2 were given`.

## When to choose it

- A **class** when some data and the operations on it belong together and you need several independent objects of that kind: accounts, orders, counters.
- **Functions and dicts** when there is no state to protect and no behavior tied to the data; not everything needs a class.
- **Inheritance** when the subclass really is a kind of its parent and keeps the parent's rules; a separate class when it would override most of the methods.
- A **custom exception** that subclasses the closest built-in when callers need to tell your failure apart from the others.
