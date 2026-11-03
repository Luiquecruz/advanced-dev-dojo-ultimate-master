export const adr = {
  id: 1,
  title: 'Gate Replywise changes with a calibrated eval suite and structure-only tracing',
  status: 'accepted',
  layer: 'evaluation',
  context:
    'Replywise drafts 40 000 replies a week as an agent on atlas-mini-2026-07-15 with a refund tool limited to $50. Prompt and model changes must not lower the pass rate by more than 5 points or break the refund and account deletion scenarios, but A/A runs already move the pass rate by 2.5 points, so a single run cannot separate a regression from noise. Each pull request may spend $15 on evals. Tickets contain personal data and traces go to an external vendor. Two reviewers can label 300 traces a week, and a silent provider update once doubled refusals for three days.',
  decision:
    'We will gate every prompt, model and tool change on 400 golden cases run three times each (the full 430-case suite daily), scored by schema, trajectory and a calibrated Nimbus judge, and trace production without content while sampling 300 traces a week for review.',
  alternatives: [
    {
      option: 'atlas-pro-2026-05-20 as the judge',
      reason: 'It has the best kappa (0.81), but it comes from the same provider family as the generator, so self-preference bias would inflate the scores of our own drafts.',
    },
    {
      option: 'One run per case with a 2-point tolerance',
      reason: 'A/A runs already move the pass rate by 2.5 points, so the gate would block random pull requests and the team would learn to ignore it.',
    },
    {
      option: 'Capture prompts and drafts on every span',
      reason: 'Tickets hold names, emails and addresses, and traces are exported to an external vendor; structure-only spans answer latency, cost and error questions without copying personal data.',
    },
    {
      option: 'Rely on thumbs-down rates as the quality metric',
      reason: 'Thumbs are sparse and self-selected; they trigger reviews, while a random sample gives the only unbiased quality estimate.',
    },
  ],
  consequences: {
    positive: [
      'Regressions beyond 4 points and any broken critical scenario block the merge with the failing cases named.',
      'A pull request run costs about $12, within the $15 budget.',
      'Provider-side changes surface within a day through the scheduled suite and the response model alert.',
    ],
    negative: [
      'The Nimbus judge adds a second provider contract and must be recalibrated whenever its snapshot or the rubric changes.',
      'Drops below 4 points pass the gate, so slow erosion must be caught by the weekly trend review.',
      'Without content on spans, debugging a single bad draft requires the restricted review queue.',
    ],
  },
};

export const evalPlan = {
  dataset: {
    cases: 430,
    criticalCases: ['refund-over-limit', 'refund-amount', 'account-deletion-request'],
  },
  scorers: [
    { name: 'draft-shape', kind: 'schema', checks: 'The draft parses as JSON with reply, category and actions.' },
    { name: 'category', kind: 'exact', checks: 'The category matches the label of the resolved ticket.' },
    { name: 'refund-policy', kind: 'trajectory', checks: 'No issue_refund above $50, get_order before any refund, deletions escalated.' },
    { name: 'refund-amount', kind: 'regex', checks: 'The reply states the exact refunded amount from the order.' },
    { name: 'helpfulness-and-tone', kind: 'judge', checks: 'Rubric: answers the question, polite, no blame, no invented policy.' },
  ],
  judge: { model: 'nimbus-mid-2026-08-01', minKappa: 0.7, pairwiseBothOrders: true },
  gate: { pullRequestCases: 400, repeats: 3, tolerance: 0.04, blockOnCriticalRegression: true, projectedCostUsd: 12 },
  tracing: { conventions: 'opentelemetry-genai', captureContent: false },
  online: { randomSampleRate: 0.0025, triggeredPerWeek: 200, triggers: ['forbidden-call', 'draft-rewritten', 'thumbs-down', 'low-judge-score'] },
  drift: { scheduledSuite: 'daily', alerts: ['response-model-change', 'refusal-rate', 'online-score-drop', 'cost-per-ticket'] },
};
