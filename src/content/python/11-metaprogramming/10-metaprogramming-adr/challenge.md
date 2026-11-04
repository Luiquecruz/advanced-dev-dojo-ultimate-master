Write the ADR and the plan for the **plugin mechanism of an exporter framework**.

## Briefing

`dx` is the command-line tool of a data platform. `dx export <name>` writes a dataset with one **exporter**, a subclass of the framework's `Exporter` base class, and `dx --help` lists the name of every installed exporter. Every environment runs Python 3.12 or newer.

- **Core repository:** **66** subclasses of `Exporter` in **48** modules. **6** of them are abstract intermediate bases (`TabularExporter`, `StreamingExporter`, ...) that must never be registered or listed.
- **Partners:** **5** partner teams each publish their own distribution, from their own repository and on their own release schedule, with **18** concrete exporters in **12** modules in total. They cannot change the core repository. Some partner exporters also inherit from `pydantic.BaseModel`, whose metaclass is pydantic's `ModelMetaclass`. Several of the 18 are internal variants that subclass another partner exporter, written by engineers who rarely read the framework documentation.
- **Rules for every concrete exporter:** it declares a `name` that is unique across all distributions, a `file_extension` and a `schema` dict. A missing attribute or a duplicate name must fail with a message naming the class and its module **when the class is created**, so that the CI job that imports every plugin module catches it before any export runs.
- **Startup:** `dx` must print its first output within **150 ms**; the core (argument parsing, configuration, logging) already takes **95 ms**. Importing a plugin module costs **4 ms** on average (`python -X importtime`). Reading the entry-point metadata of the installed distributions takes **12 ms**. A command uses exactly **1** exporter.
- **Trust:** any installed distribution can declare entry points in any group, and loading one runs its code. Only the core distribution and the 5 partner distributions may provide exporters.

## Task

In `adr.py`, define two constants.

**`ADR`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `"accepted"`.
- `context`: at least 80 characters; mentions the `import` cost and the `partner` teams.
- `decision`: at least 40 characters, starts with `We will`, and names the discovery and registration mechanisms you chose.
- `alternatives`: at least two `{"option", "reason"}` with distinct options (at least 3 characters) and reasons of at least 20 characters.
- `consequences`: `{"positive": [...], "negative": [...]}`, each with at least one item of at least 15 characters.

**`PLAN`**, the design:

- `discovery`: `"entry_points"`, `"package_scan"` (walk the core package's modules) or `"central_list"` (a list of import paths in the core repository), how the framework finds plugin code.
- `loading`: `"lazy"` (import only the plugin a command needs) or `"eager"` (import every plugin at startup).
- `registration`: `"init_subclass"`, `"decorator"` or `"metaclass"`, the hook that validates and registers a class.
- `validation_time`: `"class_creation"` or `"first_use"`.
- `metaclass_needed`: a bool.
- `registered_classes`: an integer, the number of exporters registered when the CI job imports every plugin module of the core and the partners.
- `eager_import_ms`: a number, the time spent importing every plugin module at startup.
- `plugin_budget_ms`: a number, the startup time left for plugins after the core.
- `lazy_import_ms`: a number, the plugin-related startup time of one `dx export` command with lazy loading: reading the entry-point metadata plus importing the one exporter's module.
- `trust_policy`: `"allow_list"` or `"any_installed"`; `allowed_distributions`: an integer, how many distributions may provide exporters.
- `rejected`: at least two `{"pattern", "reason"}` with distinct patterns (at least 3 characters) and reasons of at least 20 characters.

The plan must be coherent with the briefing. The tests check these relationships, so reason from the numbers rather than from the field names:

1. The counts and costs follow from the briefing's numbers.
2. Loading fits the startup budget, and discovery reaches code that is published outside the core repository.
3. Mistakes surface at class creation, for subclasses at any depth, and the hook coexists with the metaclasses partner classes already have.
4. Discovery that runs code from installed distributions is limited to the ones the briefing trusts.
5. The decision sentence names the mechanisms you put in the plan.

The tests check structure and coherence, not your wording.
