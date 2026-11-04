from main import access_report, dedupe_keep_order, unique_ids

roles = {
    "viewer": {"read"},
    "editor": {"read", "write"},
    "admin": {"read", "write", "delete"},
}
report = access_report(roles, ["viewer", "editor"], {"read", "delete"})
for name in ["granted", "common", "missing", "unused"]:
    print(name, sorted(report[name]))

print("deduped:", dedupe_keep_order(["b", "a", "b", "c", "a"]))
print("ids:", sorted(unique_ids([1, 2], (2, 3), (n for n in [3, 4]))))
