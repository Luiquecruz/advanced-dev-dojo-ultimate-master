A **property** turns attribute syntax into method calls. Callers keep writing `account.balance` and `account.balance = 10`; the class decides what reading, writing and deleting mean.

```py
class Account:
    def __init__(self, balance=0):
        self.balance = balance          # goes through the setter below

    @property
    def balance(self):
        return self._balance

    @balance.setter
    def balance(self, value):
        if value < 0:
            raise ValueError("balance cannot be negative")
        self._balance = value

    @balance.deleter
    def balance(self):
        self._balance = 0
```

The value lives in the instance as `_balance`; `balance` itself lives on the **class**, as a `property` object. A property with only a getter is **read-only**: assigning raises `AttributeError`. A getter with no stored value at all is a **computed** attribute.

## Start public, add properties later

In Python you start with a plain public attribute. When a rule appears (validation, a derived value, a deprecation), you replace the attribute with a property of the same name and no caller changes. That is why Python code does not write `get_balance()`/`set_balance()` pairs "just in case".

## Coming from TypeScript and JavaScript

```ts
class Account {
  private _balance = 0;
  constructor(balance: number) { this._balance = balance; }   // skips the setter
  get balance() { return this._balance; }
  set balance(value: number) { if (value < 0) throw new Error("negative"); this._balance = value; }
}
```

- The habit to drop: assigning the **backing field** in the constructor (`this._balance = balance`). The translated `self._balance = balance` in `__init__` lets `Account(-5)` through, because only the setter validates. Assign the public name, `self.balance = balance`, so construction takes the same path as every later write.
- The same leak happens between related properties. A `fahrenheit` setter that writes `self._celsius` directly skips the Celsius validation; delegate to the validated setter instead (`self.celsius = ...`).
- There is no `private`. A leading underscore is a convention meaning "internal"; anyone can still reach `obj._balance`.

## How it works

`property` is a **data descriptor**: an object stored on the class with `__get__`, `__set__` and `__delete__`. Because it defines `__set__`, it takes priority over the instance `__dict__`, so `obj.balance = 5` runs the setter instead of creating an instance attribute.

```py
print(type(Account.__dict__["balance"]))   # <class 'property'>
print(Account.balance.fget)                # the getter function
```

`@balance.setter` does not modify the property: it returns a **new** property with the setter added, which is why each decorated method must use the same name.

Pitfalls:

- Storing the value under the public name (`self.balance = value` inside the setter) calls the setter again and recurses until `RecursionError`.
- Expensive getters look cheap at the call site. If computing takes time, cache it (`functools.cached_property`) or make it a method.
- A property that mutates state on read surprises everyone; keep getters free of side effects.

## When to choose it

- **Plain attribute** by default.
- **`property`** when one attribute needs validation, a derived value, or a read-only view, and you want to keep the attribute syntax.
- **A descriptor class** (next lesson) when the same rule repeats across many attributes or classes: fifteen copies of a validating property are fifteen chances to drift.
- **A method** when the operation is slow, takes arguments or has side effects.
