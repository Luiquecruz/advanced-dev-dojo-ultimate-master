1. Run the starter handlers and print `handler.__closure__[0].cell_contents` for each: they all point at the same cell.
2. Decide how to create one cell per value: a call to a factory function creates a new scope each time.
3. Apply the same fix to the multipliers, and check it with a generator so you do not rely on indexing a list.
4. For `once`, list the states the wrapper can be in (not called, called with a result) and which variables encode them without confusing `None` with "not called".
5. Order the assignments so a raising call leaves the state untouched, then confirm that two wrappers built from different functions never see each other's results.
