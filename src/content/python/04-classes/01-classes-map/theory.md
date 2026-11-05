**Question this module answers:** where does an attribute really live, and which hook runs when you read, write or create one?

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

## Coming from TypeScript and JavaScript

```ts
class Account { static currency = "EUR"; }
```

- JavaScript walks the prototype chain; Python looks at the instance, then the class and its bases in MRO order. The shape is similar, but a Python class can **intercept** lookup with descriptors before the instance is consulted.
- Methods are plain functions stored on the class. `obj.method` binds `self` on access because functions are descriptors, so there is no `this` to lose: `handler = obj.method` keeps `obj`.
- `constructor` does two jobs; Python splits creation (`__new__`) from initialization (`__init__`).

## What this module covers

`__new__` and `__init__`, properties, descriptors with `__set_name__`, dataclasses, `__slots__`, data model methods (`__repr__`, `__eq__`, `__hash__`, ordering and arithmetic), and cooperative multiple inheritance with `super()` and the MRO. It ends with an ADR for the domain model of an order system.

## When to choose it

Work through this module before you design a class hierarchy or a validation layer. Its closing decision: for each kind of class in a domain model, choose the creation hook, the validation mechanism (property, descriptor or `__post_init__`), the memory layout (`__dict__` or `__slots__`) and how behavior is shared (mixins with cooperative `super()`, inheritance or composition).
