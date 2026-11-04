from main import connect, describe_signature

print("defaults:", connect("db"))
print("named options:", connect("db", 6543, ssl=False, timeout=1.5))

attempts = {
    'connect(host="db")': lambda: connect(host="db"),
    'connect("db", 5433, False)': lambda: connect("db", 5433, False),
}
for label, call in attempts.items():
    try:
        call()
        print("accepted", label)
    except TypeError as error:
        print("rejected", label, "->", error)

print("connect kinds:", describe_signature(connect))
print("divmod kinds:", describe_signature(divmod))
