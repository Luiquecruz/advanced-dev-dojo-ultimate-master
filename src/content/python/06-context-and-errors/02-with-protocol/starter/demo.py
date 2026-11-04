from main import Timer, Transaction


class PrintingStore:
    def __init__(self, name: str) -> None:
        self.name = name

    def begin(self) -> None:
        print(f"[{self.name}] begin")

    def commit(self) -> None:
        print(f"[{self.name}] commit")

    def rollback(self) -> None:
        print(f"[{self.name}] rollback")


readings = iter([0.0, 0.25, 1.0, 1.75])


def clock() -> float:
    return next(readings)


with Timer(clock) as timer, Transaction(PrintingStore("orders")):
    print("capture payment 41")
print("elapsed:", timer.elapsed)

try:
    with Timer(clock) as timer, Transaction(PrintingStore("orders")) as transaction:
        print("capture payment 42")
        raise RuntimeError("card declined")
except RuntimeError as error:
    print("propagated:", error, "| kept by __exit__:", transaction.error is error)
print("elapsed:", timer.elapsed)
