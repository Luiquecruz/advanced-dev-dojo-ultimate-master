def company_ontology():
    return {
        "classes": [
            {"name": "Entity"},
            {"name": "Organization", "parent": "Entity"},
            {"name": "Company", "parent": "Organization"},
            {"name": "Person", "parent": "Entity"},
            {"name": "Employee", "parent": "Person"},
            {"name": "Manager", "parent": "Employee"},
            {"name": "Project", "parent": "Entity"},
        ],
        "properties": [
            {"name": "name", "kind": "attribute", "domain": "Entity", "range": "string", "min": 1, "max": 1},
            {"name": "email", "kind": "attribute", "domain": "Person", "range": "string", "max": 1},
            {"name": "headcount", "kind": "attribute", "domain": "Organization", "range": "number"},
            {"name": "active", "kind": "attribute", "domain": "Project", "range": "boolean"},
            {"name": "worksFor", "kind": "relation", "domain": "Employee", "range": "Organization", "min": 1, "max": 1},
            {"name": "reportsTo", "kind": "relation", "domain": "Employee", "range": "Manager", "max": 1},
            {"name": "manages", "kind": "relation", "domain": "Manager", "range": "Project"},
        ],
    }


def valid_graph():
    return {
        "nodes": [
            {"id": "acme", "label": "Company", "properties": {"name": "Acme", "headcount": 120}},
            {"id": "lia", "label": "Manager", "properties": {"name": "Lia", "email": "lia@acme.test"}},
            {"id": "tom", "label": "Employee", "properties": {"name": "Tom"}},
            {"id": "atlas", "label": "Project", "properties": {"name": "Atlas", "active": True}},
        ],
        "edges": [
            {"from": "lia", "type": "worksFor", "to": "acme"},
            {"from": "tom", "type": "worksFor", "to": "acme"},
            {"from": "tom", "type": "reportsTo", "to": "lia"},
            {"from": "lia", "type": "manages", "to": "atlas"},
        ],
    }


def keys(violations):
    return sorted(f"{violation['code']}|{violation['subject']}|{violation.get('property') or ''}" for violation in violations)


def property_names(ontology, class_name):
    return [definition["name"] for definition in mod.properties_for(ontology, class_name)]


@test("ancestors_of and is_subclass_of follow the inheritance chain up to the root")
def _():
    ontology = company_ontology()
    assert mod.ancestors_of(ontology, "Manager") == ["Manager", "Employee", "Person", "Entity"]
    assert mod.ancestors_of(ontology, "Entity") == ["Entity"]
    assert mod.ancestors_of(ontology, "Spaceship") == []
    assert mod.is_subclass_of(ontology, "Manager", "Person") is True
    assert mod.is_subclass_of(ontology, "Company", "Organization") is True
    assert mod.is_subclass_of(ontology, "Employee", "Employee") is True
    assert mod.is_subclass_of(ontology, "Employee", "Manager") is False
    assert mod.is_subclass_of(ontology, "Company", "Person") is False
    assert mod.is_subclass_of(ontology, "Spaceship", "Entity") is False


@test("properties_for returns the properties a class declares or inherits, in ontology order")
def _():
    ontology = company_ontology()
    assert property_names(ontology, "Manager") == ["name", "email", "worksFor", "reportsTo", "manages"]
    assert property_names(ontology, "Employee") == ["name", "email", "worksFor", "reportsTo"]
    assert property_names(ontology, "Person") == ["name", "email"]
    assert property_names(ontology, "Company") == ["name", "headcount"]
    assert property_names(ontology, "Spaceship") == []


@test("validate_ontology reports unknown parents, inheritance cycles, unknown domains and ranges, and attribute ranges that are not datatypes")
def _():
    assert mod.validate_ontology(company_ontology()) == []
    broken = {
        "classes": [
            {"name": "Entity"},
            {"name": "Robot", "parent": "Machine"},
            {"name": "Chicken", "parent": "Egg"},
            {"name": "Egg", "parent": "Chicken"},
        ],
        "properties": [
            {"name": "name", "kind": "attribute", "domain": "Entity", "range": "string"},
            {"name": "serial", "kind": "attribute", "domain": "Gadget", "range": "string"},
            {"name": "builtBy", "kind": "relation", "domain": "Robot", "range": "Factory"},
            {"name": "weight", "kind": "attribute", "domain": "Entity", "range": "kilograms"},
        ],
    }
    problems = mod.validate_ontology(broken)
    assert len(problems) == 6
    for name in ["Machine", "Chicken", "Egg", "Gadget", "Factory", "kilograms"]:
        assert any(name in problem for problem in problems), name


@test("validate_graph accepts a valid graph, including subclasses where the ontology names a parent class")
def _():
    assert mod.validate_graph(company_ontology(), valid_graph()) == []
    assert mod.validate_graph(company_ontology(), {"nodes": [], "edges": []}) == []


@test("validate_graph reports unknown classes, properties and nodes with messages naming the subject")
def _():
    graph = valid_graph()
    graph["nodes"].append({"id": "zed", "label": "Alien", "properties": {"name": "Zed"}})
    graph["nodes"][2]["properties"] = {"name": "Tom", "shoeSize": 44}
    graph["edges"].append({"from": "tom", "type": "likes", "to": "atlas"})
    graph["edges"].append({"from": "tom", "type": "worksFor", "to": "ghost-corp"})
    graph["edges"].append({"from": "lia", "type": "manages", "to": "zed"})
    graph["nodes"][1]["properties"]["worksFor"] = "acme"
    violations = mod.validate_graph(company_ontology(), graph)
    assert keys(violations) == [
        "unknown-class|zed|",
        "unknown-node|tom -[worksFor]-> ghost-corp|",
        "unknown-property|lia|worksFor",
        "unknown-property|tom -[likes]-> atlas|likes",
        "unknown-property|tom|shoeSize",
    ]
    for violation in violations:
        assert violation["subject"].split(" ")[0] in violation["message"]
        if "property" in violation:
            assert violation["property"] in violation["message"]


@test("validate_graph checks domain and range on attributes and relations, honoring inheritance")
def _():
    graph = valid_graph()
    graph["nodes"][0]["properties"]["headcount"] = "one hundred twenty"
    graph["nodes"][3]["properties"]["email"] = "atlas@acme.test"
    graph["edges"].append({"from": "acme", "type": "manages", "to": "atlas"})
    graph["edges"].append({"from": "lia", "type": "manages", "to": "tom"})
    graph["edges"].append({"from": "lia", "type": "reportsTo", "to": "tom"})
    violations = mod.validate_graph(company_ontology(), graph)
    assert keys(violations) == [
        "domain|acme -[manages]-> atlas|manages",
        "domain|atlas|email",
        "range|acme|headcount",
        "range|lia -[manages]-> tom|manages",
        "range|lia -[reportsTo]-> tom|reportsTo",
    ]


@test("validate_graph checks minimum and maximum cardinality, including inherited properties, and returns every violation at once")
def _():
    graph = valid_graph()
    graph["nodes"].append({"id": "ivy", "label": "Employee", "properties": {}})
    graph["nodes"].append({"id": "globex", "label": "Company", "properties": {"name": "Globex"}})
    graph["edges"].append({"from": "tom", "type": "worksFor", "to": "globex"})
    graph["edges"].append({"from": "lia", "type": "reportsTo", "to": "lia"})
    graph["edges"].append({"from": "tom", "type": "reportsTo", "to": "lia"})
    violations = mod.validate_graph(company_ontology(), graph)
    assert keys(violations) == [
        "max-cardinality|tom|reportsTo",
        "max-cardinality|tom|worksFor",
        "min-cardinality|ivy|name",
        "min-cardinality|ivy|worksFor",
    ]
    for violation in violations:
        assert violation["subject"] in violation["message"]
        assert violation["property"] in violation["message"]
