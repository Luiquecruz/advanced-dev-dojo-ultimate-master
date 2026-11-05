from main import parse_all, parse_quantity, read_port, run_with_log, safe_ratio

print("quantity:", parse_quantity(" 7 "))
try:
    parse_quantity("12abc")
except ValueError as error:
    print("rejected:", error)

print("ratio:", safe_ratio(3, 4), safe_ratio(3, 0))
print("ports:", read_port({"port": "8000"}), read_port({}))
print("parsed:", parse_all(["3", "two", "-1", " 5 "]))

log = []
print("result:", run_with_log(lambda: "saved", log), log)
