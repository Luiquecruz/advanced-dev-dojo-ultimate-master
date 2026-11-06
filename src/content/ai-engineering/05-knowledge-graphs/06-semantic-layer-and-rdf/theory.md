# RDF, Property Graphs and the Semantic Layer

The previous lessons used property graphs because they map naturally to code. A second family, the **semantic web stack** (RDF, OWL, SHACL, SPARQL), has powered knowledge graphs in life sciences, government and publishing for two decades. And a third idea, the **semantic layer**, applies the same goal (one shared meaning) to business metrics. Engineers building AI systems meet all three, often in the same company.

## RDF: everything is a triple

**RDF** (Resource Description Framework, a W3C standard) represents knowledge as **triples**: *subject, predicate, object*.

```text
@prefix ex: <https://example.com/> .
@prefix schema: <https://schema.org/> .

ex:ana    a                 schema:Person ;
          schema:name       "Ana Souza" ;
          schema:worksFor   ex:acme .
ex:acme   a                 schema:Organization ;
          schema:name       "Acme Corp" .
```

- Subjects and predicates are **IRIs** (global identifiers), so `schema:worksFor` means the same thing in every dataset that uses it. Objects are IRIs or **literals** (`"Ana Souza"`, typed numbers, dates).
- A set of triples is a graph; graphs from different sources merge by simply taking the union, because shared IRIs line up. This is the main strength of RDF: **data integration across organizations**.
- Formats: Turtle (above), JSON-LD (common for web pages and APIs), N-Triples, RDF/XML.

The vocabulary layers on top:

- **RDFS** adds classes, `subClassOf`, `domain` and `range`.
- **OWL** adds richer logic (equivalent classes, inverse and transitive properties, cardinality restrictions) for **reasoners** that infer new facts. Remember lesson 03: OWL works under the open-world assumption, so it infers rather than rejects.
- **SHACL** describes **shapes** that data must conform to (required properties, datatypes, value ranges) and produces a validation report. It is the closed-world validator of the RDF stack.
- **SKOS** models thesauri and taxonomies (broader, narrower, preferred labels).

## SPARQL vs Cypher and GQL

Both families have declarative pattern-matching query languages. Here is "the products that use parts from suppliers in Germany":

```sql
# SPARQL
SELECT DISTINCT ?product WHERE {
  ?supplier ex:country "DE" ;
            ex:supplies ?part .
  ?part ex:usedIn ?product .
}
```

```text
// Cypher (and very close to ISO GQL)
MATCH (s:Supplier {country: 'DE'})-[:SUPPLIES]->(:Part)-[:USED_IN]->(p:Product)
RETURN DISTINCT p
```

SPARQL matches triple patterns with variables; Cypher draws the path as ASCII art. Both support variable-length paths (SPARQL property paths such as `ex:dependsOn+`, Cypher `-[:DEPENDS_ON*1..3]->`). **GQL** (ISO/IEC 39075) is the ISO standard query language for property graphs, drawing on Cypher and other graph languages; **SQL/PGQ** brings the same pattern matching into SQL.

| | RDF (triple stores) | Property graphs |
| --- | --- | --- |
| Unit | triple with global IRIs | node and edge with local ids |
| Properties on edges | via reification or RDF 1.2 triple terms | native |
| Schema and validation | RDFS, OWL (inference), SHACL (validation) | engine constraints, GQL graph types, application code |
| Query | SPARQL (W3C) | Cypher, GQL (ISO), Gremlin |
| Strength | integration across organizations, open vocabularies, reasoning | developer ergonomics, fast traversals, edge properties |

Neither is "better". RDF shines when data must be shared with others under stable global identifiers; property graphs shine inside one application with heavy traversal. Bridges exist in both directions, and many engines speak both.

## The semantic layer

Ask three dashboards for "revenue" and you get three numbers: one includes refunds, one counts by invoice date, one excludes a region. A **semantic layer** defines business entities, **metrics** and dimensions **once** (name, formula, filters, grain, owner) and serves them to every consumer: BI tools, APIs, spreadsheets and, increasingly, **AI agents**.

For AI it matters a lot. A model writing SQL against raw tables must guess joins, filters and definitions, and gets them subtly wrong. A model that calls a semantic layer asks for `revenue by region last quarter` and gets the governed number. The semantic layer is the ontology of the analytics world: shared definitions that make answers consistent across teams and agents.

## Pitfalls

- Choosing RDF or a property graph by fashion instead of by who must share the data and how it is queried.
- Expecting OWL to validate data (use SHACL or constraints).
- Letting an agent query raw warehouse tables for governed metrics.
- Defining metrics in each dashboard, then asking why the agent disagrees with finance.

RDF 1.1, SPARQL 1.1, OWL 2 and SHACL are W3C Recommendations, and ISO GQL covers property graph queries. Semantic layer products include dbt's MetricFlow, Cube, LookML and warehouse-native semantic views, and open interchange specifications exist to exchange semantic models between tools.

## When to choose it

Choose RDF and its stack when knowledge must be integrated across organizations or published under stable identifiers, when you reuse public vocabularies, or when standards-based validation and reasoning are required (life sciences, government, publishing). Choose a property graph for application-internal graphs with heavy traversal. Put a semantic layer in front of analytics before letting agents answer metric questions; without one, every agent invents its own definition of revenue.
