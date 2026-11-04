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


def ancestors_of(ontology, class_name):
    # TODO: the class itself, then its parent, grandparent... up to the root; [] for an unknown class; stop on a cycle
    return [class_name]


def is_subclass_of(ontology, class_name, ancestor):
    # TODO: True when ancestor is the class itself or one of its ancestors
    return class_name == ancestor


def properties_for(ontology, class_name):
    # TODO: properties whose domain is the class or one of its ancestors, in ontology order
    return [definition for definition in ontology["properties"] if definition["domain"] == class_name]


def validate_ontology(ontology):
    # TODO: unknown parents, inheritance cycles, unknown domains or relation ranges, attribute ranges that are not datatypes
    return []


def validate_graph(ontology, graph):
    # TODO: collect every violation: unknown classes, properties and nodes, domain, range and cardinality
    known = {definition["name"] for definition in ontology["classes"]}
    return [
        {"code": "unknown-class", "subject": node["id"], "message": f'Unknown class {node["label"]}'}
        for node in graph["nodes"]
        if node["label"] not in known
    ]
