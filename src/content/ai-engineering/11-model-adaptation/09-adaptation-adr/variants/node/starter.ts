export const adr = {
  id: 11,
  // TODO: a short title naming the decision
  title: '',
  // TODO: accept the decision
  status: 'proposed',
  layer: 'model',
  // TODO: the forces from the briefing: volume, eval targets, latency, privacy and self-hosting, weekly depot codes, pilot results
  context: '',
  // TODO: one sentence starting with "We will", naming the rung, the base model, the serving setup and the eval gate
  decision: '',
  // TODO: at least two { option, reason } you considered and rejected, each reason citing a fact from the briefing
  alternatives: [] as Array<{ option: string; reason: string }>,
  // TODO: what the team gains and what it now owns or must watch
  consequences: { positive: [] as string[], negative: [] as string[] },
};

export const adaptationPlan = {
  // TODO: the lowest rung whose pilot meets every target
  rung: 'training',
  // TODO: a method that fits the 48 GB training GPU, or null when the weights do not change
  method: 'full' as string | null,
  data: {
    // TODO: between the learning-curve plateau and what remains after the eval set
    trainingExamples: 9000,
    evalExamples: 0,
    redactPersonalData: false,
    maxSyntheticShare: 0.5,
  },
  // TODO: where the weekly depot codes come from
  freshFacts: 'weights',
  evalGate: {
    minTypeAccuracy: 0.9,
    minValidJson: 0.99,
    // TODO: the best rung below the chosen one
    baseline: 'prompt',
    rerunOn: [] as string[],
  },
  serving: {
    // TODO: an engine the platform runs in production, a quantization that meets the targets, the memory formula
    engine: 'ollama',
    quantization: 'bf16',
    estimatedGpuMemoryGb: 0,
  },
  supplyChain: {
    // TODO: a base model that passes the policy, at its pinned revision
    baseModel: 'heron-8b-merge',
    revision: 'main',
    weightsFormat: 'pickle',
    trustRemoteCode: true,
    checks: [] as string[],
  },
};
