from main import LineReader, Paginator, is_iterator, is_reiterable

orders = Paginator([["order-1", "order-2"], [], ["order-3"]])
print("first pass: ", list(orders))
print("second pass:", list(orders))
pairs = [(left, right) for left in orders for right in orders if left < right]
print("pairs to compare:", pairs)

reader = LineReader(["GET /orders\n", "POST /orders\n", "GET /health\n"])
for line in reader:
    print(f"line {reader.line_number}: {line}")
print("second loop over the reader:", list(reader))

for name, value in [("list", [1, 2]), ("Paginator", orders), ("LineReader", reader), ("generator", (n for n in [1]))]:
    print(f"{name:>10}: iterator={is_iterator(value)!s:<5} reiterable={is_reiterable(value)}")
