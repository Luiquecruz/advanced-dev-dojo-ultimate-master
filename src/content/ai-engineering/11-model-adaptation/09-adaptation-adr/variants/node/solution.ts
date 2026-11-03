export const adr = {
  id: 11,
  title: 'Fine-tune a self-hosted 8B model with LoRA to parse delivery exceptions',
  status: 'accepted',
  layer: 'model',
  context:
    'Waypoint parses 400 000 driver notes a day into JSON records and must reach 93% type accuracy and 99.5% valid JSON on our frozen 500-note eval set within an 800 ms p95. Notes contain personal data that retailer contracts forbid sending to third-party APIs, so inference runs on our own 24 GB GPUs. Depot codes change weekly. Prompting, retrieval and examples with a lookup tool peaked at 88.9% accuracy in the pilot.',
  decision:
    'We will fine-tune wren-8b-instruct at revision a41c9e7 with LoRA on 6 000 redacted notes, keep depot codes behind the lookup tool, serve the merged model in fp8 on vLLM, and promote it only through an eval gate of 93% accuracy and 99.5% valid JSON.',
  alternatives: [
    {
      option: 'Stay on examples and a lookup tool',
      reason: 'The best context-layer setup reached 88.9% type accuracy and 99.4% valid JSON, below both targets.',
    },
    {
      option: 'Frontier API model',
      reason: 'It reaches 96.4%, but retailer contracts forbid sending personal data to third-party APIs and its 1 700 ms p95 breaks the latency target.',
    },
    {
      option: 'heron-8b-merge as base model',
      reason: 'Its pilot accuracy is the highest of the 8B models, but it has no license, ships pickle files that need remote code and comes from an anonymous account.',
    },
    {
      option: 'osprey-32b-instruct as base model',
      reason: 'Even in int4 its weights take 16 GB and its KV cache another 16 GB, so it cannot fit the 24 GB serving GPU.',
    },
    {
      option: 'Serve in int4 to save memory',
      reason: 'The int4 model drops to 92.4% type accuracy, below the 93% target; fp8 fits in about 18 GB at 94.7%.',
    },
  ],
  consequences: {
    positive: [
      'Accuracy rises from 88.9% to about 94.7% with a 290 ms p95, and personal data never leaves our GPUs.',
      'Shorter prompts make each call cheaper than the examples setup, and depot code changes need no retraining.',
    ],
    negative: [
      'We now own a training pipeline: every new base revision, data refresh or quantization change means retraining or re-evaluating.',
      'The fine-tuned model and its adapter become artifacts to secure, record in the AI-BOM and govern.',
      'Rare exception types depend on a capped share of synthetic notes that need review before each training run.',
    ],
  },
};

export const adaptationPlan = {
  rung: 'fine-tuning',
  method: 'lora' as string | null,
  data: {
    trainingExamples: 6000,
    evalExamples: 500,
    redactPersonalData: true,
    maxSyntheticShare: 0.1,
  },
  freshFacts: 'tools',
  evalGate: {
    minTypeAccuracy: 0.93,
    minValidJson: 0.995,
    baseline: 'examples-and-tools',
    rerunOn: ['new-training-data', 'base-model-revision', 'quantization-change', 'runtime-upgrade'],
  },
  serving: {
    engine: 'vllm',
    quantization: 'fp8',
    estimatedGpuMemoryGb: 18,
  },
  supplyChain: {
    baseModel: 'wren-8b-instruct',
    revision: 'a41c9e7',
    weightsFormat: 'safetensors',
    trustRemoteCode: false,
    checks: [
      'license-allows-commercial-use',
      'verified-publisher',
      'pinned-revision',
      'file-hashes',
      'safetensors-only',
      'malware-scan',
      'internal-mirror',
      'ai-bom-entry',
    ],
  },
};
