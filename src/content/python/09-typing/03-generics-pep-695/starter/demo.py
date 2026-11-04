from main import Box, Pair, Stack, first, swap

print("first:", first([0, 7]), first([], default="empty"), "| params:", first.__type_params__)

jobs = Stack[str]()
jobs.push("build")
jobs.push("test")
print("peek:", jobs.peek(), "| pop:", jobs.pop(), "| left:", len(jobs))
print("Stack params:", Stack.__type_params__, "| instance type:", type(jobs).__name__)
jobs.push(42)
print("Stack[str] accepted an int at runtime:", jobs.peek())

print("Pair:", getattr(Pair, "__type_params__", ()), "->", getattr(Pair, "__value__", Pair), "| swap:", swap(("left", "right")))

constraint = next(iter(Box.__type_params__), None)
print("Box constraints:", getattr(constraint, "__constraints__", None), "| bound:", getattr(constraint, "__bound__", None))
print("doubled:", Box(21).doubled(), Box("ab").doubled())
