Write a small **ontology validator**: inheritance helpers, a check of the ontology itself, and a closed-world validator that returns **every** violation in a graph, each with a clear message.

## Data shapes

- An ontology is `{ classes, properties }`.
  - A class is `{ name, parent? }`; `parent` names another class (`subClassOf`).
  - A property is `{ name, kind, domain, range, min?, max? }`. `kind` is `'attribute'` (a literal value; `range` is `'string'`, `'number'` or `'boolean'`) or `'relation'` (an edge; `range` is a class name). `domain` is the class whose instances may have the property. `min` and `max` bound how many values each instance has. Property names are unique.
- A graph is `{ nodes, edges }`. A node is `{ id, label, properties }` where `label` is its class and `properties` holds attribute values. An edge is `{ from, type, to }` where `type` is a relation name.

## 1. `ancestorsOf(ontology, className)` and `isSubclassOf(ontology, className, ancestor)`

`ancestorsOf` returns the class itself, then its parent, its grandparent and so on up to the root (`['Manager', 'Employee', 'Person', 'Entity']`), or `[]` for an unknown class. Stop if a class repeats. `isSubclassOf` is `true` when `ancestor` is in that list (a class is a subclass of itself).

## 2. `propertiesFor(ontology, className)`

The properties whose `domain` is the class or one of its ancestors, in ontology order.

## 3. `validateOntology(ontology)`

Return a list of messages (an empty list for a valid ontology), one per problem, each containing the offending name:

- a class whose `parent` is not a defined class (the message contains the parent's name);
- a class that is part of an inheritance cycle: following parents leads back to it (one message per class in the cycle, containing that class's name);
- a property whose `domain` is not a defined class (contains the domain);
- a relation whose `range` is not a defined class (contains the range);
- an attribute whose `range` is not `'string'`, `'number'` or `'boolean'` (contains the range).

## 4. `validateGraph(ontology, graph)`

Return every violation as `{ code, subject, property?, message }`, in any order. `subject` is the node id for node violations and `` `${from} -[${type}]-> ${to}` `` for edge violations. `property` is set when a property is involved. `message` is readable and contains the subject's id (`from` for edges) and the property name when there is one.

For each node:

- `unknown-class`: its `label` is not a defined class. Skip the other checks for that node.
- `unknown-property`: a key in `properties` that is not an **attribute** of the ontology (unknown, or a relation).
- `domain`: an attribute whose domain is not the node's class or one of its ancestors.
- `range`: an attribute value whose `typeof` differs from the attribute's range.
- `min-cardinality` / `max-cardinality`: for each property in `propertiesFor(node.label)` with `min` or `max`, count the values: an attribute counts `1` when present in `properties` and `0` otherwise; a relation counts the node's outgoing edges of that type whose target node exists.

For each edge:

- `unknown-node`: `from` or `to` is not a node id. Skip the other checks for that edge.
- `unknown-property`: `type` is not a **relation** of the ontology. Skip the other checks.
- `domain`: the source node's class is not a subclass of the relation's domain.
- `range`: the target node's class is not a subclass of the relation's range.
- Skip the domain or range check when that endpoint's class is unknown (it already has an `unknown-class` violation).

The tests use an ontology with three levels of inheritance and check codes, subjects, properties and that messages name what they report.
