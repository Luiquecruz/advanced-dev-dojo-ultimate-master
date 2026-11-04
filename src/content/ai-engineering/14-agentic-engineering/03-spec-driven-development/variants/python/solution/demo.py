import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import build_traceability, parse_requirements, plan_tasks

SPEC = """# Spec: Invoice export

## Requirements
- REQ-1: An account owner can export all invoices of a year as CSV.
- REQ-2: The export includes the VAT number of every invoice.
- REQ-3: Only account owners and billing admins can start an export.
- REQ-4: An export of more than 10 000 invoices runs in the background and emails a link."""

TESTS = [
    "TASK-1 exports the invoices of 2025 as CSV",
    "REQ-2: every row has a VAT number column",
    "TASK-3 rejects a viewer with 403",
    "shows a spinner while exporting",
]


async def main():
    fake_model.reply(
        respond.malformed_json({"tasks": []}),
        respond.json({
            "tasks": [
                {"id": "TASK-1", "text": "Add the CSV export endpoint", "requirements": ["REQ-1", "REQ-2"]},
                {"id": "TASK-2", "text": "Queue large exports and email a link", "requirements": ["REQ-4"]},
                {"id": "TASK-3", "text": "Check the export permission", "requirements": ["REQ-3"]},
                {"id": "TASK-4", "text": "Export to PDF as well", "requirements": ["REQ-5"]},
            ],
        }),
    )

    print(f"Spec: {len(parse_requirements(SPEC))} requirements")
    tasks = await plan_tasks(create_model(), SPEC)
    print(f"Plan: {len(tasks)} tasks after {len(fake_model.requests)} model call(s)")
    for task in tasks:
        print(f"  {task['id']} {task['text']} -> {', '.join(task['requirements'])}")

    report = build_traceability(spec=SPEC, tasks=tasks, tests=TESTS)
    print("\nTraceability matrix")
    for row in report["rows"]:
        print(f"  {row['requirement']:<6} {row['status']:<10} tasks: {', '.join(row['tasks']) or '-'}  tests: {len(row['tests'])}")
    print(f"\nCoverage: {round(report['coverage'] * 100)}%")
    print(f"Uncovered requirements: {', '.join(report['uncoveredRequirements']) or 'none'}")
    print(f"Orphan tasks: {', '.join(report['orphanTasks']) or 'none'}")
    print(f"Tests without a requirement: {' | '.join(report['testsWithoutRequirement']) or 'none'}")
    unknown = ", ".join(f"{reference['from']} -> {reference['id']}" for reference in report["unknownReferences"])
    print(f"Unknown references: {unknown or 'none'}")


if __name__ == "__main__":
    asyncio.run(main())
