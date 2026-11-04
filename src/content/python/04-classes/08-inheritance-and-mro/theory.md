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

## Coming from TypeScript and JavaScript

```ts
const Audited = <T extends new (...a: any[]) => Entity>(Base: T) =>
  class extends Base {
    save(log: string[]) { log.push("Audited"); return super.save(log); }
  };
class Order extends Audited(Timestamped(Entity)) {}
```

JavaScript has single inheritance; mixins are functions that build a chain, and `super` is fixed lexically to the class the mixin was applied to. Two habits break in Python:

- **Calling the parent by name**: `Entity.save(self, log)` is the translation of `Parent.prototype.save.call(this, log)`. In a chain of mixins it jumps straight to `Entity` and skips every mixin after the first one. The opposite mistake, a class that calls each of its bases by name (`Audited.save(self, log)` then `Timestamped.save(self, log)`), runs the shared `Entity.save` twice. Always use `super().save(log)`.
- **Reading `super()` as "my base class"**. The target depends on the final class, so the same mixin can call a different method in each composition. Every `save` in the chain must accept the same arguments and call `super()`, or the chain breaks for everyone after it.

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

Cooperative `__init__` follows the same rule: accept `**kwargs`, take what you need, pass the rest on with `super().__init__(**kwargs)`.

## When to choose it

- **Mixins with cooperative `super()`** for small, orthogonal behaviors (audit, timestamps, validation) combined in many classes. Every method in the chain calls `super()` and shares one signature.
- **Single inheritance** when there is one real "is a" relationship.
- **Composition** (an object holding a helper) when behaviors need their own state, configuration or different signatures; it is easier to test and to reorder at runtime.
- Avoid deep hierarchies, and avoid mixins that silently depend on each other's attribute names.
