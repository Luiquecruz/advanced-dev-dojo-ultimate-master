from main import properties_for, validate_graph, validate_ontology

ONTOLOGY = {
    "classes": [
        {"name": "Entity"},
        {"name": "Organization", "parent": "Entity"},
        {"name": "Supplier", "parent": "Organization"},
        {"name": "Part", "parent": "Entity"},
        {"name": "Product", "parent": "Entity"},
    ],
    "properties": [
        {"name": "name", "kind": "attribute", "domain": "Entity", "range": "string", "min": 1, "max": 1},
        {"name": "country", "kind": "attribute", "domain": "Organization", "range": "string", "max": 1},
        {"name": "unitCost", "kind": "attribute", "domain": "Part", "range": "number", "max": 1},
        {"name": "supplies", "kind": "relation", "domain": "Supplier", "range": "Part"},
        {"name": "usedIn", "kind": "relation", "domain": "Part", "range": "Product", "min": 1},
    ],
}

EXTRACTED = {
    "nodes": [
        {"id": "acme", "label": "Supplier", "properties": {"name": "Acme Metals", "country": "DE"}},
        {"id": "bolt-m4", "label": "Part", "properties": {"name": "M4 bolt", "unitCost": 0.04}},
        {"id": "hinge", "label": "Part", "properties": {"name": "Hinge", "unitCost": "cheap"}},
        {"id": "gasket", "label": "Part", "properties": {"name": "Gasket"}},
        {"id": "kettle", "label": "Product", "properties": {"name": "Kettle", "color": "red"}},
        {"id": "berlin", "label": "City", "properties": {"name": "Berlin"}},
    ],
    "edges": [
        {"from": "acme", "type": "supplies", "to": "bolt-m4"},
        {"from": "acme", "type": "supplies", "to": "kettle"},
        {"from": "bolt-m4", "type": "usedIn", "to": "kettle"},
        {"from": "hinge", "type": "usedIn", "to": "kettle"},
        {"from": "kettle", "type": "usedIn", "to": "bolt-m4"},
        {"from": "acme", "type": "locatedIn", "to": "berlin"},
    ],
}


def main():
    ontology_problems = validate_ontology(ONTOLOGY)
    print(f"Ontology problems: {'none' if not ontology_problems else '; '.join(ontology_problems)}")
    print(f"A Supplier may have: {', '.join(definition['name'] for definition in properties_for(ONTOLOGY, 'Supplier'))}")

    violations = validate_graph(ONTOLOGY, EXTRACTED)
    print(f"\n{len(violations)} violations in the extracted graph:")
    for violation in violations:
        print(f"  [{violation['code']}] {violation['message']}")
    rejected_subjects = {violation["subject"] for violation in violations}
    clean = [node["id"] for node in EXTRACTED["nodes"] if node["id"] not in rejected_subjects]
    print(f"\nNodes with no violation: {', '.join(clean)}")


if __name__ == "__main__":
    main()
