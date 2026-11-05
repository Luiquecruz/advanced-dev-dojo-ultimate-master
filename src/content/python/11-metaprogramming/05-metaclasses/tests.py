@test("RequiresNameMeta rejects a class body without a string name when the class statement runs")
async def _():
    class Command(metaclass=mod.RequiresNameMeta):
        name = "base"

    class Deploy(Command):
        name = "deploy"

    def inherits_the_name():
        class Rollback(Command):
            pass

    def declares_a_number():
        class Status(metaclass=mod.RequiresNameMeta):
            name = 3

    missing = await capture_error(inherits_the_name)
    wrong_type = await capture_error(declares_a_number)
    assert isinstance(missing, TypeError)
    assert "Rollback" in str(missing)
    assert isinstance(wrong_type, TypeError)
    assert "Status" in str(wrong_type)
    assert Deploy.name == "deploy"


# beginner mistake: returning the cached instance but letting __init__ run again on every call, which resets its state
@test("SingletonMeta creates one instance per class and runs __init__ only once")
def _():
    inits = []

    class Settings(metaclass=mod.SingletonMeta):
        def __init__(self, env="dev"):
            inits.append(env)
            self.values = {}

    class TestSettings(Settings):
        pass

    first = Settings("prod")
    first.values["region"] = "eu"
    second = Settings("staging")
    child = TestSettings()
    child_again = TestSettings()
    assert first is second
    assert second.values == {"region": "eu"}
    assert inits == ["prod", "dev"]
    assert type(child) is TestSettings
    assert child is child_again


@test("subclassing a FinalMeta class fails with TypeError when the subclass statement runs")
async def _():
    class Money(metaclass=mod.FinalMeta):
        def __init__(self, cents):
            self.cents = cents

    def subclass_it():
        class Points(Money):
            pass

    error = await capture_error(subclass_it)
    price = Money(250)
    assert isinstance(error, TypeError)
    assert "Money" in str(error)
    assert price.cents == 250


@test("unrelated metaclasses conflict, and a metaclass deriving from both combines their behavior")
async def _():
    class Settings(metaclass=mod.SingletonMeta):
        pass

    class Locked(metaclass=mod.FinalMeta):
        pass

    def mix():
        class Both(Settings, Locked):
            pass

    conflict = await capture_error(mix)
    assert isinstance(conflict, TypeError)
    assert "metaclass" in str(conflict)

    class SingletonFinalMeta(mod.SingletonMeta, mod.FinalMeta):
        pass

    inits = []

    class AppConfig(metaclass=SingletonFinalMeta):
        def __init__(self):
            inits.append(1)

    def extend():
        class Custom(AppConfig):
            pass

    same = AppConfig() is AppConfig()
    final_error = await capture_error(extend)
    assert same
    assert len(inits) == 1
    assert isinstance(final_error, TypeError)
