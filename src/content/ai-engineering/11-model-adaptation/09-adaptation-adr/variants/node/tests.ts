const { adr, adaptationPlan } = mod;

const TARGETS = { typeAccuracy: 0.93, validJson: 0.995, p95Ms: 800 };
const RUNGS = ['prompt', 'retrieval', 'examples-and-tools', 'fine-tuning', 'training'];
const WEIGHT_RUNGS = ['fine-tuning', 'training'];

const LADDER: Record<string, { typeAccuracy: number; validJson: number; p95Ms: number }> = {
  prompt: { typeAccuracy: 0.81, validJson: 0.972, p95Ms: 340 },
  retrieval: { typeAccuracy: 0.845, validJson: 0.981, p95Ms: 610 },
  'examples-and-tools': { typeAccuracy: 0.889, validJson: 0.994, p95Ms: 720 },
  'fine-tuning': { typeAccuracy: 0.95, validJson: 0.999, p95Ms: 290 },
};

const BASE_MODELS: Record<string, { billionsOfParameters: number; kvMegabytesPerToken: number; commercialUse: boolean; safetensors: boolean; verifiedPublisher: boolean; revision: string }> = {
  'wren-8b-instruct': { billionsOfParameters: 8, kvMegabytesPerToken: 0.125, commercialUse: true, safetensors: true, verifiedPublisher: true, revision: 'a41c9e7' },
  'kestrel-9b-chat': { billionsOfParameters: 9, kvMegabytesPerToken: 0.25, commercialUse: false, safetensors: true, verifiedPublisher: true, revision: '77d02b1' },
  'heron-8b-merge': { billionsOfParameters: 8, kvMegabytesPerToken: 0.125, commercialUse: false, safetensors: false, verifiedPublisher: false, revision: 'c0ffee1' },
  'osprey-32b-instruct': { billionsOfParameters: 32, kvMegabytesPerToken: 0.25, commercialUse: true, safetensors: true, verifiedPublisher: true, revision: '5be2a90' },
};

const BYTES_PER_WEIGHT: Record<string, number> = { bf16: 2, fp8: 1, int4: 0.5 };

const QUANTIZED_RESULTS: Record<string, { typeAccuracy: number; validJson: number }> = {
  'wren-8b-instruct/bf16': { typeAccuracy: 0.95, validJson: 0.999 },
  'wren-8b-instruct/fp8': { typeAccuracy: 0.947, validJson: 0.999 },
  'wren-8b-instruct/int4': { typeAccuracy: 0.924, validJson: 0.996 },
};

const TRAINING_BYTES_PER_PARAMETER: Record<string, number> = { full: 16, lora: 2, qlora: 0.5 };
const TRAINING_GPU_GB = 48;
const SERVING_GPU_GB = 24;
const CONCURRENT_SEQUENCES = 64;
const TOKENS_PER_SEQUENCE = 1024;
const OVERHEAD_GB = 2;
const LABELED_NOTES = 9000;
const EVAL_NOTES = 500;
const PLATEAU_NOTES = 4000;

const RERUN_EVENTS = ['new-training-data', 'base-model-revision', 'quantization-change', 'runtime-upgrade', 'weekly-schedule'];
const SUPPLY_CHAIN_CHECKS = ['license-allows-commercial-use', 'verified-publisher', 'pinned-revision', 'file-hashes', 'safetensors-only', 'malware-scan', 'signature-verification', 'internal-mirror', 'ai-bom-entry'];
const REQUIRED_CHECKS = ['license-allows-commercial-use', 'verified-publisher', 'pinned-revision', 'file-hashes', 'safetensors-only', 'ai-bom-entry'];

function meetsTargets(result: { typeAccuracy: number; validJson: number; p95Ms?: number }): boolean {
  const fastEnough = result.p95Ms === undefined || result.p95Ms <= TARGETS.p95Ms;
  return result.typeAccuracy >= TARGETS.typeAccuracy && result.validJson >= TARGETS.validJson && fastEnough;
}

function baseModel(id: string) {
  const found = BASE_MODELS[id];
  if (!found) {
    throw new Error(`"${id}" is not a base model from the briefing table`);
  }
  return found;
}

function servingMemoryGb(): number {
  const model = baseModel(adaptationPlan.supplyChain.baseModel);
  const bytes = BYTES_PER_WEIGHT[adaptationPlan.serving.quantization];
  if (bytes === undefined) {
    throw new Error(`"${adaptationPlan.serving.quantization}" is not a quantization from the briefing table`);
  }
  const kvCacheGb = (CONCURRENT_SEQUENCES * TOKENS_PER_SEQUENCE * model.kvMegabytesPerToken) / 1024;
  return model.billionsOfParameters * bytes + kvCacheGb + OVERHEAD_GB;
}

test('the ADR is an accepted model-layer decision whose context names the eval targets and the privacy constraint, with a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('model');
  expect(adr.title.trim().length).toBeGreaterThanOrEqual(10);
  expect(adr.context.trim().length).toBeGreaterThanOrEqual(80);
  expect(adr.context).toMatch(/accura|eval/i);
  expect(adr.context).toMatch(/privacy|personal data|contract|self-host|own GPU|third-party/i);
  expect(adr.decision.trim().length).toBeGreaterThanOrEqual(40);
  expect(adr.decision.trim()).toMatch(/^we will\b/i);
});

test('lists at least two distinct rejected alternatives with reasons, and positive and negative consequences', () => {
  expect(Array.isArray(adr.alternatives)).toBe(true);
  expect(adr.alternatives.length).toBeGreaterThanOrEqual(2);
  adr.alternatives.forEach((alternative: { option: string; reason: string }) => {
    expect(alternative.option.trim().length).toBeGreaterThanOrEqual(3);
    expect(alternative.reason.trim().length).toBeGreaterThanOrEqual(20);
  });
  const options = adr.alternatives.map((alternative: { option: string }) => alternative.option.trim().toLowerCase());
  expect(new Set(options).size).toBe(options.length);
  ['positive', 'negative'].forEach((side) => {
    expect(Array.isArray(adr.consequences[side])).toBe(true);
    expect(adr.consequences[side].length).toBeGreaterThanOrEqual(1);
    adr.consequences[side].forEach((item: string) => expect(item.trim().length).toBeGreaterThanOrEqual(15));
  });
});

test('climbs to the lowest rung that meets every target, against the best rung below it, with a method that fits the training GPU', () => {
  const lowestPassing = RUNGS.find((rung) => LADDER[rung] && meetsTargets(LADDER[rung]));
  expect(adaptationPlan.rung).toBe(lowestPassing);
  const rungsBelow = RUNGS.slice(0, RUNGS.indexOf(adaptationPlan.rung)).filter((rung) => LADDER[rung]);
  const bestBelow = rungsBelow.reduce((best, rung) => (LADDER[rung].typeAccuracy > LADDER[best].typeAccuracy ? rung : best));
  expect(adaptationPlan.evalGate.baseline).toBe(bestBelow);
  expect(WEIGHT_RUNGS).toContain(adaptationPlan.rung);
  expect(Object.keys(TRAINING_BYTES_PER_PARAMETER)).toContain(adaptationPlan.method);
  const trainingMemoryGb = baseModel(adaptationPlan.supplyChain.baseModel).billionsOfParameters * TRAINING_BYTES_PER_PARAMETER[adaptationPlan.method];
  expect(trainingMemoryGb).toBeLessThanOrEqual(TRAINING_GPU_GB);
});

test('the data plan keeps the eval set frozen, redacts personal data, caps synthetic data and keeps weekly facts out of the weights', () => {
  const { trainingExamples, evalExamples, redactPersonalData, maxSyntheticShare } = adaptationPlan.data;
  expect(Number.isInteger(trainingExamples)).toBe(true);
  expect(trainingExamples).toBeGreaterThanOrEqual(PLATEAU_NOTES);
  expect(trainingExamples).toBeLessThanOrEqual(LABELED_NOTES - EVAL_NOTES);
  expect(evalExamples).toBe(EVAL_NOTES);
  expect(redactPersonalData).toBe(true);
  expect(typeof maxSyntheticShare).toBe('number');
  expect(maxSyntheticShare).toBeGreaterThanOrEqual(0);
  expect(maxSyntheticShare).toBeLessThanOrEqual(0.2);
  expect(['prompt', 'retrieval', 'tools']).toContain(adaptationPlan.freshFacts);
});

test('the eval gate is at least as strict as the targets and reruns when data, base model or quantization change', () => {
  const { minTypeAccuracy, minValidJson, rerunOn } = adaptationPlan.evalGate;
  expect(minTypeAccuracy).toBeGreaterThanOrEqual(TARGETS.typeAccuracy);
  expect(minTypeAccuracy).toBeLessThanOrEqual(1);
  expect(minValidJson).toBeGreaterThanOrEqual(TARGETS.validJson);
  expect(minValidJson).toBeLessThanOrEqual(1);
  rerunOn.forEach((event: string) => expect(RERUN_EVENTS).toContain(event));
  ['new-training-data', 'base-model-revision', 'quantization-change'].forEach((event) => expect(rerunOn).toContain(event));
});

test('serves on a production engine with a quantization that meets the targets and fits the 24 GB GPU by the memory formula', () => {
  expect(['vllm', 'sglang']).toContain(adaptationPlan.serving.engine);
  const key = `${adaptationPlan.supplyChain.baseModel}/${adaptationPlan.serving.quantization}`;
  const result = QUANTIZED_RESULTS[key];
  if (!result) {
    throw new Error(`the briefing has no eval result for ${key}`);
  }
  expect(meetsTargets(result)).toBe(true);
  const expected = servingMemoryGb();
  expect(expected).toBeLessThanOrEqual(SERVING_GPU_GB);
  expect(typeof adaptationPlan.serving.estimatedGpuMemoryGb).toBe('number');
  expect(Math.abs(adaptationPlan.serving.estimatedGpuMemoryGb - expected)).toBeLessThanOrEqual(expected * 0.1);
  expect(adaptationPlan.serving.estimatedGpuMemoryGb).toBeLessThanOrEqual(SERVING_GPU_GB);
});

test('the base model passes the supply-chain policy at its pinned revision, with remote code off and every policy check listed', () => {
  const { baseModel: id, revision, weightsFormat, trustRemoteCode, checks } = adaptationPlan.supplyChain;
  const model = baseModel(id);
  expect(model.commercialUse).toBe(true);
  expect(model.safetensors).toBe(true);
  expect(model.verifiedPublisher).toBe(true);
  expect(revision).toBe(model.revision);
  expect(weightsFormat).toBe('safetensors');
  expect(trustRemoteCode).toBe(false);
  checks.forEach((check: string) => expect(SUPPLY_CHAIN_CHECKS).toContain(check));
  REQUIRED_CHECKS.forEach((check) => expect(checks).toContain(check));
});
