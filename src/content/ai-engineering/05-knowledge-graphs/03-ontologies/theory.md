# Ontologies

A graph accepts any node and any edge. That freedom becomes a problem as soon as several teams, scripts or models write to it: one writes `worksFor`, another `employedBy`, a third links a person to a city with `worksFor`. An **ontology** is the formal vocabulary that stops this: which **classes** of things exist, which **properties** connect them, and which **constraints** every fact must satisfy. It is the schema of a knowledge graph, plus meaning.

## Taxonomy vs ontology

- A **taxonomy** is a hierarchy of terms: `Manager` is a kind of `Employee`, which is a kind of `Person`. Product categories and tag trees are taxonomies.
- An **ontology** adds relationships and rules: an `Employee` *works for* exactly one `Organization`; a `Manager` *manages* `Project`s; `headcount` is a number that only organizations have.

Taxonomies help navigation and filtering. Ontologies let you **validate** data and **reason** over it.

## Classes and inheritance

Classes form a hierarchy through `subClassOf` (here, `parent`). Inheritance means two things:

1. **Membership:** every `Manager` is also an `Employee`, a `Person` and an `Entity`. A rule that accepts an `Employee` accepts a `Manager`.
2. **Properties flow down:** a property defined on `Person` (`email`) applies to every subclass.

```ts
const ontology = {
  classes: [
    { name: 'Entity' },
    { name: 'Person', parent: 'Entity' },
    { name: 'Employee', parent: 'Person' },
    { name: 'Manager', parent: 'Employee' },
    { name: 'Organization', parent: 'Entity' },
  ],
  properties: [
    { name: 'name', kind: 'attribute', domain: 'Entity', range: 'string', min: 1, max: 1 },
    { name: 'worksFor', kind: 'relation', domain: 'Employee', range: 'Organization', min: 1, max: 1 },
  ],
};
```

Keep the hierarchy shallow and meaningful. A subclass should add properties or constraints; if it adds nothing, it is probably a property value (`role: 'manager'`) instead.

## Properties: domain, range and cardinality

Each property has:

- a **kind**: an **attribute** holds a literal value (string, number, boolean, date); a **relation** points to another node;
- a **domain**: the class of the subject (who may have it);
- a **range**: the datatype of the value, or the class of the target node;
- a **cardinality**: how many values each subject has (`min 1` means required, `max 1` means single-valued).

Validation checks every fact against those definitions and returns **all** violations, not only the first, each naming the subject, the property and the rule:

| Violation | Example |
| --- | --- |
| Unknown class or property | a node labeled `Alien`, an edge typed `likes` |
| Domain | a `Project` with an `email` |
| Range | `headcount: 'one hundred'`; `reportsTo` pointing to a non-manager |
| Cardinality | an employee with no `worksFor`, or two |

Returning every violation matters when the data comes from a model (lesson 04): you can log, count and fix classes of errors instead of retrying blindly.

## Open world vs closed world

There is a subtlety that surprises engineers. In **OWL**, the W3C ontology language, `domain` and `range` are *inference* rules under an **open-world assumption**: if `worksFor` has range `Organization` and someone says `ana worksFor berlin`, a reasoner concludes that `berlin` is an `Organization`, rather than reporting an error. Missing facts are unknown, not false.

Applications usually want the opposite, **closed-world validation**: data that breaks the rules is rejected. In the RDF world that is the job of **SHACL** shapes; in property graphs, schema constraints and application code. This lesson's validator is closed-world: it treats the ontology as constraints. Lesson 06 returns to OWL and SHACL.

## Why ontologies matter for AI systems

- **Schema-guided extraction:** the classes and properties go into the prompt, and the validator rejects whatever the model invents (lesson 04).
- **Consistent outputs across teams and agents:** when every agent emits `Customer` and `ownsAccount` from the same vocabulary, outputs can be merged, compared and audited.
- **Interoperability:** shared vocabularies such as schema.org let data from different systems line up without custom mapping.
- **Better retrieval:** typed edges make traversals precise (`DEPENDS_ON`, not "related to").

## Designing one

Start from **competency questions**: the questions the graph must answer ("which teams are affected when this database fails?"). Each question names classes and relations; anything no question needs can wait. Reuse an existing vocabulary when one fits. Version the ontology like code, and validate the ontology itself: unknown parents, inheritance cycles, properties pointing at classes that do not exist.

## Pitfalls

- Modeling the whole world up front instead of the questions you must answer.
- Vague relations (`relatedTo`) that carry no meaning.
- Deep hierarchies where subclasses add nothing.
- Expecting OWL domain and range to reject bad data.
- Stopping validation at the first error.

> **Status as of October 2026:** OWL 2 (2012), RDFS and SHACL (2017) are W3C Recommendations; RDF 1.2 and SPARQL 1.2 are progressing through the W3C process. schema.org is the most widely used shared vocabulary on the web. Property graph engines enforce constraints in different ways (Neo4j offers uniqueness, existence, key and property type constraints), and ISO GQL defines graph types for constraining graph contents.

## When to choose it

Write an explicit ontology when several teams, sources or agents write to the same graph, when the domain is regulated and facts must be auditable, or when model-extracted data must be validated before anyone trusts it. For a single small app with one writer, a typed schema in code (TypeScript types plus a validation library) is enough; a formal ontology there is over-engineering. Grow from the competency questions, not from a diagram of everything.
