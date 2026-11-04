1. Place each rule on the class creation timeline: a missing `name` and a forbidden subclass are facts about the class statement, so they belong in the metaclass `__new__`; "one instance" is about calling the class, so it belongs in the metaclass `__call__`.
2. For `RequiresNameMeta`, read the namespace rather than the finished class, because the class would find an inherited `name` through its MRO.
3. For `SingletonMeta`, remember what `type.__call__` does (`__new__`, then `__init__` when the result is an instance) and decide to skip both after the first call, keeping the instance on each class separately.
4. For `FinalMeta`, inspect the bases before the class exists and raise with the final base's name.
5. Write every method cooperatively, passing all arguments to `super()`, then check the combined metaclass from the tests: `SingletonFinalMeta(SingletonMeta, FinalMeta)` reaches `FinalMeta.__new__` and `SingletonMeta.__call__` through its MRO.
6. Ask, for each rule, whether a lighter hook would do: the name and final checks also fit `__init_subclass__`; only the singleton needs control of `__call__`.
