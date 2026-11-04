from main import make_counter, make_history

next_id, reset_ids = make_counter(100, 10)
print("ids:", next_id(), next_id(), next_id())
reset_ids()
print("after reset:", next_id())

other_id, _ = make_counter()
print("independent counter:", other_id(), other_id())

record, entries = make_history(3)
for event in ["login", "search", "view", "buy", "logout"]:
    record(event)
print("last events:", entries())
