Everything rests on `ancestors_of`. Build a dict from class name to definition, start from the class and follow `"parent"` while the class exists and has not been seen yet. `is_subclass_of` and `properties_for` are then one line each: `in` on that list.
---
For cycles in `validate_ontology`, walk the parents of each class: if you meet the class itself again, it is in a cycle; if you meet any other class twice, the cycle does not contain it, so stop. Unknown domains and ranges are lookups in the same class dict; datatypes are a list of three strings.
---
In `validate_graph`, build dicts of classes, properties by name and nodes by id first. Append violations through one small nested `report(code, subject, message, property_name=None)` helper that adds `"property"` only when it is given, so every check stays a single `if`. Use `continue` after an `unknown-class`, `unknown-node` or unknown edge type so later checks never run on data you cannot interpret.
---
Cardinality runs per node over `properties_for(ontology, node["label"])`: the count is `1 if name in node["properties"] else 0` for attributes and the number of edges with `edge["from"] == node["id"]`, `edge["type"] == name` and an existing target for relations. Compare with `"min"` and `"max"` only when the definition has them.
