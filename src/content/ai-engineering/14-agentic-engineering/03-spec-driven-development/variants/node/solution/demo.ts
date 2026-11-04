import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { buildTraceability, parseRequirements, planTasks } from './main';

const SPEC = `# Spec: Invoice export

## Requirements
- REQ-1: An account owner can export all invoices of a year as CSV.
- REQ-2: The export includes the VAT number of every invoice.
- REQ-3: Only account owners and billing admins can start an export.
- REQ-4: An export of more than 10 000 invoices runs in the background and emails a link.`;

const TESTS = [
  'TASK-1 exports the invoices of 2025 as CSV',
  'REQ-2: every row has a VAT number column',
  'TASK-3 rejects a viewer with 403',
  'shows a spinner while exporting',
];

async function main() {
  fakeModel.reply(
    respond.malformedJson({ tasks: [] }),
    respond.json({
      tasks: [
        { id: 'TASK-1', text: 'Add the CSV export endpoint', requirements: ['REQ-1', 'REQ-2'] },
        { id: 'TASK-2', text: 'Queue large exports and email a link', requirements: ['REQ-4'] },
        { id: 'TASK-3', text: 'Check the export permission', requirements: ['REQ-3'] },
        { id: 'TASK-4', text: 'Export to PDF as well', requirements: ['REQ-5'] },
      ],
    }),
  );

  console.log(`Spec: ${parseRequirements(SPEC).length} requirements`);
  const tasks = await planTasks(createModel(), SPEC);
  console.log(`Plan: ${tasks.length} tasks after ${fakeModel.requests.length} model call(s)`);
  tasks.forEach((task) => console.log(`  ${task.id} ${task.text} -> ${task.requirements.join(', ')}`));

  const report = buildTraceability({ spec: SPEC, tasks, tests: TESTS });
  console.log('\nTraceability matrix');
  report.rows.forEach((row) => console.log(`  ${row.requirement.padEnd(6)} ${row.status.padEnd(10)} tasks: ${row.tasks.join(', ') || '-'}  tests: ${row.tests.length}`));
  console.log(`\nCoverage: ${Math.round(report.coverage * 100)}%`);
  console.log(`Uncovered requirements: ${report.uncoveredRequirements.join(', ') || 'none'}`);
  console.log(`Orphan tasks: ${report.orphanTasks.join(', ') || 'none'}`);
  console.log(`Tests without a requirement: ${report.testsWithoutRequirement.join(' | ') || 'none'}`);
  console.log(`Unknown references: ${report.unknownReferences.map((reference) => `${reference.from} -> ${reference.id}`).join(', ') || 'none'}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
