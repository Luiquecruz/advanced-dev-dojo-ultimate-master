Everything rests on `ancestorsOf`. Build a `Map` from class name to definition, start from the class and follow `parent` while the class exists and has not been seen yet. `isSubclassOf` and `propertiesFor` are then one line each: `includes` on that list.
---
For cycles in `validateOntology`, walk the parents of each class: if you meet the class itself again, it is in a cycle; if you meet any other class twice, the cycle does not contain it, so stop. Unknown domains and ranges are lookups in the same class map; datatypes are a list of three strings.
---
In `validateGraph`, build `Map`s of classes, properties by name and nodes by id first. Push violations through one small `report(code, subject, message, property?)` helper so every check stays a single `if`. Use `continue` after an `unknown-class`, `unknown-node` or unknown edge type so later checks never run on data you cannot interpret.
---
Cardinality runs per node over `propertiesFor(ontology, node.label)`: the count is `node.properties[name] !== undefined ? 1 : 0` for attributes and the number of edges with `edge.from === node.id`, `edge.type === name` and an existing target for relations. Compare with `min` and `max` only when they are defined.
