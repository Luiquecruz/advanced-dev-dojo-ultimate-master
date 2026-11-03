import { createModel } from '@dojo/ai';
import type { GenerateRequest } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { orchestrate, PLANNER_SYSTEM, WORKER_SYSTEM } from './main';

const QUESTION = 'Which observability vendor should we pick: Beacon, Lumen or Prism? Compare pricing, retention and OpenTelemetry support.';

const PLAN = {
  subtasks: [
    { id: 'beacon', instruction: 'Research Beacon: pricing per GB, retention options, OpenTelemetry support.' },
    { id: 'lumen', instruction: 'Research Lumen: pricing per GB, retention options, OpenTelemetry support.' },
    { id: 'prism', instruction: 'Research Prism: pricing per GB, retention options, OpenTelemetry support.' },
  ],
};

const FINDINGS: Record<string, string> = {
  Beacon: 'Beacon: $0.30 per GB, 30 days retention by default, native OTLP ingest.',
  Prism: 'Prism: $0.45 per GB, 90 days retention, OTLP through a collector add-on.',
};

function systemOf(request: GenerateRequest) {
  return request.messages.find((message) => message.role === 'system')?.content;
}

function userOf(request: GenerateRequest) {
  return request.messages.find((message) => message.role === 'user')?.content ?? '';
}

async function main() {
  let planCalls = 0;
  fakeModel.handle((request) => {
    if (systemOf(request) === PLANNER_SYSTEM) {
      planCalls += 1;
      return planCalls === 1 ? respond.truncated(JSON.stringify(PLAN), 0.6) : respond.json(PLAN);
    }
    if (systemOf(request) === WORKER_SYSTEM) {
      const vendor = Object.keys(FINDINGS).find((name) => userOf(request).includes(name));
      return vendor === undefined ? respond.error(503) : respond.slow(5, respond.text(FINDINGS[vendor]));
    }
    return respond.text('Beacon is the cheapest with native OTLP; Prism keeps data longest. Lumen could not be researched and needs a follow-up.');
  });

  const result = await orchestrate(QUESTION, { model: createModel(), maxSubtasks: 5, concurrency: 2, maxPlanAttempts: 2 });

  console.log(`planner calls: ${planCalls}`);
  console.log(`plan: ${result.plan.map((subtask) => subtask.id).join(', ')}`);
  for (const worker of result.results) {
    console.log(`  ${worker.id}: ${worker.status === 'ok' ? worker.output : `failed (${worker.error})`}`);
  }
  console.log(`answer: ${result.answer}`);
  console.log(`usage: ${result.usage.calls} calls, ${result.usage.inputTokens} input tokens, ${result.usage.outputTokens} output tokens, $${result.usage.cost.toFixed(6)}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
