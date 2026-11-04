DATATYPES = ["string", "number", "boolean"]


def datatype_of(value):
    """The ontology datatype of a Python value: "boolean", "number", "string", or the Python type name for anything else."""
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, str):
        return "string"
    return type(value).__name__


def class_by_name(ontology):
    return {definition["name"]: definition for definition in ontology["classes"]}


def ancestors_of(ontology, class_name):
    classes = class_by_name(ontology)
    chain = []
    current = classes.get(class_name)
    while current is not None and current["name"] not in chain:
        chain.append(current["name"])
        current = classes.get(current["parent"]) if "parent" in current else None
    return chain


def is_subclass_of(ontology, class_name, ancestor):
    return ancestor in ancestors_of(ontology, class_name)


def properties_for(ontology, class_name):
    ancestors = ancestors_of(ontology, class_name)
    return [definition for definition in ontology["properties"] if definition["domain"] in ancestors]


def validate_ontology(ontology):
    classes = class_by_name(ontology)
    problems = []
    for definition in ontology["classes"]:
        if "parent" in definition and definition["parent"] not in classes:
            problems.append(f'Class "{definition["name"]}" has an unknown parent "{definition["parent"]}"')
        if inheritance_cycle(classes, definition["name"]):
            problems.append(f'Class "{definition["name"]}" is part of an inheritance cycle')
    for definition in ontology["properties"]:
        if definition["domain"] not in classes:
            problems.append(f'Property "{definition["name"]}" has an unknown domain "{definition["domain"]}"')
        if definition["kind"] == "relation" and definition["range"] not in classes:
            problems.append(f'Relation "{definition["name"]}" has an unknown range class "{definition["range"]}"')
        if definition["kind"] == "attribute" and definition["range"] not in DATATYPES:
            problems.append(f'Attribute "{definition["name"]}" has range "{definition["range"]}", which is not one of {", ".join(DATATYPES)}')
    return problems


def inheritance_cycle(classes, class_name):
    seen = set()
    current = classes.get(class_name)
    while current is not None and "parent" in current:
        if current["parent"] == class_name:
            return True
        if current["parent"] in seen:
            return False
        seen.add(current["parent"])
        current = classes.get(current["parent"])
    return False


def validate_graph(ontology, graph):
    classes = class_by_name(ontology)
    properties_by_name = {definition["name"]: definition for definition in ontology["properties"]}
    nodes_by_id = {node["id"]: node for node in graph["nodes"]}
    violations = []

    def report(code, subject, message, property_name=None):
        violation = {"code": code, "subject": subject, "message": message}
        if property_name is not None:
            violation["property"] = property_name
        violations.append(violation)

    for node in graph["nodes"]:
        if node["label"] not in classes:
            report("unknown-class", node["id"], f'Node "{node["id"]}" has class "{node["label"]}", which the ontology does not define')
            continue
        for key, value in node["properties"].items():
            definition = properties_by_name.get(key)
            if definition is None or definition["kind"] != "attribute":
                report("unknown-property", node["id"], f'Node "{node["id"]}" has property "{key}", which is not an attribute in the ontology', key)
                continue
            if not is_subclass_of(ontology, node["label"], definition["domain"]):
                report("domain", node["id"], f'Node "{node["id"]}" is a {node["label"]}, but "{key}" applies to {definition["domain"]}', key)
            if datatype_of(value) != definition["range"]:
                report("range", node["id"], f'Node "{node["id"]}" has {datatype_of(value)} value for "{key}", expected {definition["range"]}', key)
        for definition in properties_for(ontology, node["label"]):
            name = definition["name"]
            if definition["kind"] == "attribute":
                count = 1 if name in node["properties"] else 0
            else:
                count = sum(1 for edge in graph["edges"] if edge["from"] == node["id"] and edge["type"] == name and edge["to"] in nodes_by_id)
            if "min" in definition and count < definition["min"]:
                report("min-cardinality", node["id"], f'Node "{node["id"]}" has {count} "{name}", at least {definition["min"]} required', name)
            if "max" in definition and count > definition["max"]:
                report("max-cardinality", node["id"], f'Node "{node["id"]}" has {count} "{name}", at most {definition["max"]} allowed', name)

    for edge in graph["edges"]:
        subject = f'{edge["from"]} -[{edge["type"]}]-> {edge["to"]}'
        missing = [node_id for node_id in (edge["from"], edge["to"]) if node_id not in nodes_by_id]
        if missing:
            missing_ids = '", "'.join(missing)
            report("unknown-node", subject, f'Edge {subject} references unknown node "{missing_ids}"')
            continue
        definition = properties_by_name.get(edge["type"])
        if definition is None or definition["kind"] != "relation":
            report("unknown-property", subject, f'Edge {subject} has type "{edge["type"]}", which is not a relation in the ontology', edge["type"])
            continue
        source = nodes_by_id[edge["from"]]
        target = nodes_by_id[edge["to"]]
        if source["label"] in classes and not is_subclass_of(ontology, source["label"], definition["domain"]):
            report("domain", subject, f'Edge {subject} starts at a {source["label"]}, but "{edge["type"]}" applies to {definition["domain"]}', edge["type"])
        if target["label"] in classes and not is_subclass_of(ontology, target["label"], definition["range"]):
            report("range", subject, f'Edge {subject} points to a {target["label"]}, but "{edge["type"]}" expects {definition["range"]}', edge["type"])
    return violations
