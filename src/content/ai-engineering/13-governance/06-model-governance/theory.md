# Model Governance

The model is the component that changes most often and announces it least. Providers ship new snapshots, retire old ones on a schedule, and sometimes point a friendly alias at a different model overnight. Open-weight models arrive with licenses that may forbid your use case. Model governance answers three questions for every AI feature: **which models are approved, which exact version answers right now, and how does that change safely?**

## Approval: what may enter the registry

A model registry lists every model version the company may use, with what you need to defend that choice:

| Field | Why |
| --- | --- |
| Exact version id | `acme-small-2026-05`, never `acme-small-latest` |
| Provider and hosting | API, cloud marketplace, self-hosted; region |
| License and terms | commercial use, output ownership, training on your data, usage restrictions (module 11) |
| Model or system card | intended use, known limits, evaluation results, safety measures |
| Eval results | your own suites, not only vendor benchmarks (module 10) |
| Retirement date and replacement | from the provider's deprecation schedule |
| Owner | who approves promotions and handles migrations |

Approval is cheap when it happens once per version and expensive when discovered in production: a research-only license or a provider that trains on your prompts is a finding no eval would catch.

## Pin versions, name roles

Applications should not hard-code model names, and they should never use floating aliases. Use **two levels**:

- an **alias** owned by the application, named for its role (`support-default`, `triage-cheap`);
- a **pinned version** behind it, changed only through the registry.

The alias gives you one place to switch models; the pin guarantees that what answers today is what you evaluated. A floating `-latest` alias moves the decision to the provider's release calendar.

```ts
const { versionId, warnings } = registry.resolve('support-default'); // 'acme-small-2026-05'
const response = await createModel({ model: versionId }).generate(request);
```

## Promotion gated by evals

Changing the pin is a release. Treat it like one:

1. Run the required eval suites (golden answers, refusal and safety, format) on the candidate.
2. **Absolute gates:** each suite must reach its minimum.
3. **Relative gates:** no suite may regress beyond a tolerance against the version pinned today, which is module 10's regression gate applied to models.
4. Promote, preferably gradually: shadow traffic or a canary share first, then everyone.
5. Keep the previous pin one command away. Rollback must not need a deploy.

Report every failing reason at once. "Blocked: missing-eval:refusal-safety, regression:support-golden" tells the owner what to do next; "blocked" does not.

## Deprecation is a schedule, not a surprise

Hosted models retire. Providers publish deprecation dates months ahead, but the warning sits in an email nobody reads. Make it visible where engineers look:

- store `retiresAt` and the replacement in the registry;
- warn on every resolution inside a window (30 days, say), in logs and dashboards;
- start the migration (evals on the replacement, then promotion) well before the window;
- refuse to serve a retired pin with a clear error, rather than failing inside the provider's error path at 2 a.m.

Self-hosted open weights do not retire on someone else's schedule, but they age too: security fixes, better quantizations, license changes in new releases.

## Evidence

The pin history (which version answered for which alias, from when to when, promoted by whom on which eval results) is the model layer's audit trail. It answers the regulator's "which system produced this decision in March?" and the incident review's "did anything change before the regression?".

## Pitfalls

- `-latest` aliases in production configuration.
- Evaluating with vendor benchmarks instead of your own suites.
- Promotions without a relative gate: small regressions accumulate across upgrades.
- Rollback that requires a code deploy.
- Ignoring license terms of open weights and fine-tuned derivatives.

Under the EU AI Act, providers of general-purpose models must give downstream providers documentation about capabilities and limits, which belongs in your registry entry.

## When to choose it

Pin versions from the first production feature; it costs nothing. Add the registry with eval-gated promotion when a second model or a second team appears, or when a provider announces its first deprecation that affects you. A prototype can call a model directly; anything with users should call an alias.
