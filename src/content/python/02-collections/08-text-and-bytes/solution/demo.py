from main import decode_lenient, money_row, normalize_key, truncate_utf8

print("utf-8:", decode_lenient("café".encode("utf-8")))
print("latin-1 fallback:", decode_lenient(b"caf\xe9"))

title = "añb😀"
print("cut at 3 bytes:", repr(truncate_utf8(title, 3)), "| cut at 4 bytes:", repr(truncate_utf8(title, 4)))
print("same key:", normalize_key("É") == normalize_key("É"), normalize_key("STRASSE") == normalize_key("straße"))

for label, cents in [("Coffee", 450), ("Tea", 1234)]:
    print(money_row(label, cents))
