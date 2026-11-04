from main import FinalMeta, RequiresNameMeta, SingletonMeta


class Command(metaclass=RequiresNameMeta):
    name = "command"


class Deploy(Command):
    name = "deploy"


print("commands:", [Command.name, Deploy.name])

try:

    class Rollback(Command):
        pass

except TypeError as error:
    print("rejected at definition:", error)


class Settings(metaclass=SingletonMeta):
    def __init__(self):
        print("  loading settings once")
        self.values = {"region": "eu-west-1"}


first = Settings()
second = Settings()
print("same settings object:", first is second)


class Money(metaclass=FinalMeta):
    def __init__(self, cents):
        self.cents = cents


try:

    class Points(Money):
        pass

except TypeError as error:
    print("rejected at definition:", error)

print("type of a class:", type(Settings).__name__, "| type of the metaclass:", type(SingletonMeta).__name__)
