**Question this module answers:** where does an attribute really live, and which hook runs when you read, write or create one?

## Prerequisites

Module 01 (names, identity and hashing), module 02 (protocols and `MutableMapping`) and module 03 (functions, closures and decorators, which `property` and `classmethod` build on).

## Two namespaces, one lookup

Every instance has its own namespace (`obj.__dict__`), and so does its class (`Cls.__dict__`). Reading `obj.name` searches them in a fixed order:

1. A **data descriptor** found on the class (an object with `__set__` or `__delete__`, such as a `property`).
2. The instance `__dict__`.
3. Anything else found on the class or its bases, in **MRO** order (methods, class attributes, non-data descriptors).

```py
class Account:
    currency = "EUR"                 # class attribute, shared

    def __init__(self, owner):
        self.owner = owner           # instance attribute

a, b = Account("ada"), Account("alan")
a.currency = "USD"                   # creates a.__dict__["currency"]
print(b.currency, Account.currency)  # EUR EUR
print(a.__dict__)                    # {'owner': 'ada', 'currency': 'USD'}
```

Assignment never searches: `obj.x = 1` writes to `obj.__dict__` unless a data descriptor on the class intercepts it.

## Methods live on the class

- Methods are plain functions stored on the class. Functions are descriptors, so reading `obj.method` returns a **bound method** that already holds `obj` as `self`: `handler = obj.method` and a later `handler()` still act on `obj`.
- A class can **intercept** lookup with descriptors before the instance `__dict__` is consulted. Properties, `classmethod` and `staticmethod` are built that way.
- Creating an object takes two steps: `__new__` builds the instance and `__init__` fills it in.

## What this module covers

`__new__` and `__init__`, properties, descriptors with `__set_name__`, dataclasses, `__slots__`, data model methods (`__repr__`, `__eq__`, `__hash__`, ordering and arithmetic), and cooperative multiple inheritance with `super()` and the MRO. It ends with an ADR for the domain model of an order system.

## When to choose it

Work through this module before you design a class hierarchy or a validation layer. Its closing decision: for each kind of class in a domain model, choose the creation hook, the validation mechanism (property, descriptor or `__post_init__`), the memory layout (`__dict__` or `__slots__`) and how behavior is shared (mixins with cooperative `super()`, inheritance or composition).
