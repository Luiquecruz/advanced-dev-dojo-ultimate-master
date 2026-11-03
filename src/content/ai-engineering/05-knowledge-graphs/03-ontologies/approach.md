1. Start with inheritance, because membership drives every other rule: a class's ancestor chain answers both "is a Manager an Employee?" and "which properties does a Manager have?".
2. Validate the ontology before the data. A typo in a parent or a range would make every later check wrong, and cycles would make the ancestor walk loop, so the walk must stop on repeats.
3. Treat the ontology as closed-world constraints: anything not declared is a violation, and every check produces a structured record instead of throwing, so one pass reports everything.
4. Order the checks so that a violation you cannot interpret further stops the checks that depend on it: an unknown class has no domain to compare, a dangling edge has no target class.
5. Check domain and range through the subclass relation, never by equal names, so a Manager satisfies a rule written for Employees and a Company satisfies one written for Organizations.
6. Count cardinality per instance over inherited properties, and make messages name the subject and the property, so a log of rejected facts is readable without the code.
