Python supports multiple inheritance, and every class has a single, linear **Method Resolution Order** (`Cls.__mro__`) that says where to look for an attribute. `super()` does not mean "my parent". It means **the next class in the MRO of the object being used**.

```py
class Entity:
    def save(self, log):
        log.append("Entity")
        return log

class Audited(Entity):
    def save(self, log):
        log.append("Audited")
        return super().save(log)

class Timestamped(Entity):
    def save(self, log):
        log.append("Timestamped")
        return super().save(log)

class Order(Audited, Timestamped):
    pass

print([c.__name__ for c in Order.__mro__])
# ['Order', 'Audited', 'Timestamped', 'Entity', 'object']
print(Order().save([]))
# ['Audited', 'Timestamped', 'Entity']
```

`Audited` never mentions `Timestamped`, yet its `super().save` calls `Timestamped.save`, because in an `Order` the next class after `Audited` is `Timestamped`. That is **cooperative multiple inheritance**: each class does its part and hands over, and the diamond's shared base `Entity` runs exactly once.

## How it works

**C3 linearization** builds the MRO from the class, then a merge of its bases' MROs and the list of bases, so that:

1. a class comes before its bases,
2. bases keep the left-to-right order written in the class statement,
3. each class appears once.

When no order satisfies these rules, class creation fails:

```py
class Broken(Entity, Audited): ...
# TypeError: Cannot create a consistent method resolution order (MRO) for bases Entity, Audited
```

`Entity` is listed before `Audited`, but `Audited` is a subclass of `Entity` and must come first.

Zero-argument `super()` works inside a method because the compiler gives the function a hidden `__class__` cell; it is equivalent to `super(ThisClass, self)`. Writing the explicit form couples the method to a name and breaks when the class is renamed or copied.

The target of `super()` depends on the final class, so the same mixin can call a different method in each composition. Every `save` in the chain must accept the same arguments and call `super()`, or the chain breaks for everyone after it.

Cooperative `__init__` follows the same rule: accept `**kwargs`, take what you need, pass the rest on with `super().__init__(**kwargs)`.

## Common mistakes

**Calling the parent by name instead of `super()`.** `Entity.save(self, log)` jumps straight to `Entity`, so in a chain of mixins every class after the first one is skipped:

```py
# wrong: Order().save([]) returns ["Validation", "Entity"]
class ValidationMixin(Entity):
    def save(self, log):
        log.append("Validation")
        return Entity.save(self, log)

# right: hand over to the next class in the MRO of the object
class ValidationMixin(Entity):
    def save(self, log):
        log.append("Validation")
        return super().save(log)
```

**Calling each base by name from the combined class.** `Audited.save(self, log)` followed by `Timestamped.save(self, log)` runs the shared `Entity.save` twice. One `super()` call reaches every class once.

## When to choose it

- **Mixins with cooperative `super()`** for small, orthogonal behaviors (audit, timestamps, validation) combined in many classes. Every method in the chain calls `super()` and shares one signature.
- **Single inheritance** when there is one real "is a" relationship.
- **Composition** (an object holding a helper) when behaviors need their own state, configuration or different signatures; it is easier to test and to reorder at runtime.
- Avoid deep hierarchies, and avoid mixins that silently depend on each other's attribute names.
