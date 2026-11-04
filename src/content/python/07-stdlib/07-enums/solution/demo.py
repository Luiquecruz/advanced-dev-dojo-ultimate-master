from main import Permission, Severity, Status, describe

incoming = ["PAID", "Shipped", "payed"]
for text in incoming:
    try:
        status = Status.parse(text)
        print(f"{text!r} -> {status!r} | is Status.PAID: {status is Status.PAID}")
    except ValueError as error:
        print(f"{text!r} -> rejected: {error}")

editor = Permission.READ | Permission.WRITE
print("editor:", describe(editor), "| can delete:", Permission.DELETE in editor)
print("admin:", describe(Permission.ADMIN))

alerts = {Severity.LOW: "log only", Severity.HIGH: "page the on-call"}
print("severity 3 means:", alerts[Severity(3)], "| equal to 3:", Severity.HIGH == 3)
