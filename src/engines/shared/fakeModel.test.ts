import { describe, expect, it } from 'vitest';
import { cosineSimilarity, countTokens, createFakeModelProvider, embed, ModelError, respond } from './fakeModel';
import { FAKE_MODEL_DECLARATION } from './fakeModelDeclaration';

function provider() {
  const waits: number[] = [];
  const created = createFakeModelProvider({ wait: async (ms) => void waits.push(ms) });
  return { ...created, waits, model: created.module.createModel(), fakeModel: created.testing.fakeModel };
}

const ask = (content: string) => ({ messages: [{ role: 'user' as const, content }] });

describe('fake model', () => {
  it('answers scripted replies in order with usage and cost, then falls back to a default reply', async () => {
    const { model, fakeModel } = provider();
    fakeModel.configure({ pricing: { inputPerMillion: 1_000_000, outputPerMillion: 2_000_000 } }).reply(respond.text('First'), respond.json({ ok: true }));
    const first = await model.generate(ask('Hello there'));
    expect(first).toMatchObject({ text: 'First', finishReason: 'stop', model: 'dojo-fake-1', toolCalls: [] });
    expect(first.usage).toEqual({ inputTokens: 7, outputTokens: 2, totalTokens: 9, cost: 11 });
    expect(JSON.parse((await model.generate(ask('json'))).text)).toEqual({ ok: true });
    expect((await model.generate(ask('anything'))).text).toContain('No scripted reply');
    expect(fakeModel.requests).toHaveLength(3);
  });

  it('returns tool calls with ids and raw JSON arguments, including invalid and unknown ones', async () => {
    const { model, fakeModel } = provider();
    fakeModel.reply(respond.toolCall('search', { query: 'rag' }), respond.invalidToolArguments('search'), respond.unknownTool());
    const call = await model.generate(ask('find'));
    expect(call.finishReason).toBe('tool_calls');
    expect(call.toolCalls).toEqual([{ id: 'call_1', name: 'search', arguments: '{"query":"rag"}' }]);
    const invalid = await model.generate(ask('find'));
    expect(() => JSON.parse(invalid.toolCalls[0].arguments)).toThrow();
    expect((await model.generate(ask('find'))).toolCalls[0].name).toBe('delete_everything');
  });

  it('raises provider-shaped errors, truncates at maxTokens and rejects inputs above the context window', async () => {
    const { model, fakeModel, waits } = provider();
    fakeModel.reply(respond.error(429, { retryAfterMs: 200 }), respond.slow(50, respond.text('one two three four five six seven eight')), respond.refusal());
    const error = await model.generate(ask('a')).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ModelError);
    expect(error).toMatchObject({ status: 429, code: 'rate_limit', retryAfterMs: 200 });
    expect(await model.generate({ ...ask('a'), maxTokens: 2 })).toMatchObject({ text: 'one two ', finishReason: 'length' });
    expect(waits).toEqual([50]);
    expect((await model.generate(ask('a'))).finishReason).toBe('refusal');
    fakeModel.configure({ contextWindow: 5 });
    await expect(model.generate(ask('this message is far too long for the window'))).rejects.toMatchObject({ code: 'context_length', status: 400 });
  });

  it('varies by seed but repeats exactly for the same seed', async () => {
    const run = async (seed: number) => {
      const { model, fakeModel } = provider();
      fakeModel.seed(seed).reply(...Array.from({ length: 6 }, () => respond.malformedJson({ answer: 42 })));
      return Promise.all(Array.from({ length: 6 }, () => model.generate(ask('json')).then((response) => response.text)));
    };
    expect(await run(7)).toEqual(await run(7));
    const texts = await run(3);
    texts.forEach((text) => expect(() => JSON.parse(text)).toThrow());
    expect(new Set([...(await run(1)), ...(await run(2)), ...texts]).size).toBeGreaterThan(1);
  });

  it('runs a body once per seed and names the failing seed', async () => {
    const { testing } = provider();
    const seen: number[] = [];
    await testing.forEachSeed(3, (seed) => void seen.push(seed));
    expect(seen).toEqual([1, 2, 3]);
    await expect(testing.forEachSeed(3, (seed) => expect(seed).toBeLessThan(2))).rejects.toThrow('Failed with seed 2');
  });

  it('streams text deltas, tool calls and a finish chunk, and replays recorded cassettes', async () => {
    const { model, fakeModel } = provider();
    fakeModel.replay({ model: 'recorded-model', recordedAt: '2026-10-01', replies: [{ text: 'Hello from a real model' }] });
    const chunks = [];
    for await (const chunk of model.stream(ask('hi'))) chunks.push(chunk);
    expect(chunks.filter((chunk) => chunk.type === 'text').map((chunk) => (chunk as { delta: string }).delta).join('')).toBe('Hello from a real model');
    expect(chunks.at(-1)).toMatchObject({ type: 'finish', finishReason: 'stop' });
    expect(fakeModel.requests[0].model).toBeUndefined();
    expect(model.name).toBe('recorded-model');
  });
});

describe('fake model calibration additions', () => {
  it('scripts content filtering, every error status and context length errors', async () => {
    const { model, fakeModel } = provider();
    fakeModel.reply(respond.contentFilter(), respond.error(400), respond.error(401), respond.error(529), respond.contextLength());
    expect((await model.generate(ask('a'))).finishReason).toBe('content_filter');
    await expect(model.generate(ask('a'))).rejects.toMatchObject({ status: 400, code: 'invalid_request' });
    await expect(model.generate(ask('a'))).rejects.toMatchObject({ status: 401, code: 'authentication' });
    await expect(model.generate(ask('a'))).rejects.toMatchObject({ status: 529, code: 'overloaded' });
    await expect(model.generate(ask('a'))).rejects.toMatchObject({ status: 400, code: 'context_length' });
  });

  it('fails a stream after some chunks and fails the same reply outright without streaming', async () => {
    const { model, fakeModel } = provider();
    fakeModel.reply(respond.failMidStream('one two three four five', { afterChunks: 2, status: 503 }), respond.failMidStream('one two'));
    const deltas: string[] = [];
    const error = await (async () => {
      try {
        for await (const chunk of model.stream(ask('a'))) if (chunk.type === 'text') deltas.push(chunk.delta);
      } catch (caught) {
        return caught;
      }
    })();
    expect(deltas).toEqual(['one ', 'two ']);
    expect(error).toMatchObject({ status: 503, code: 'overloaded' });
    await expect(model.generate(ask('a'))).rejects.toMatchObject({ status: 500 });
    expect(fakeModel.responses).toHaveLength(0);
  });

  it('keeps a queue per model, logs successful responses and lets provider counts drift from the estimate', async () => {
    const { module, fakeModel } = provider();
    fakeModel.forModel('cheap').reply(respond.text('cheap answer')).forModel('strong').reply(respond.text('strong answer')).reply(respond.text('shared'));
    expect(fakeModel.pending).toBe(3);
    expect((await module.createModel({ model: 'strong' }).generate(ask('a'))).text).toBe('strong answer');
    expect((await module.createModel({ model: 'cheap' }).generate(ask('a'))).text).toBe('cheap answer');
    expect((await module.createModel({ model: 'cheap' }).generate(ask('a'))).text).toBe('shared');
    expect(fakeModel.responses.map((response) => response.model)).toEqual(['strong', 'cheap', 'cheap']);
    fakeModel.configure({ tokenizerDrift: 0.5 });
    const drifted = await module.createModel().generate(ask('abcdefghijklmnop'));
    expect(drifted.usage.inputTokens).toBe(Math.ceil(countTokens(ask('abcdefghijklmnop').messages) * 1.5));
  });
});

describe('embeddings', () => {
  it('are deterministic unit vectors where shared words mean higher similarity', () => {
    const [refund, refunds, shipping] = embed(['How do I get a refund?', 'Refund policy for orders', 'Shipping times to Brazil']);
    expect(embed('How do I get a refund?')).toEqual(refund);
    expect(Math.hypot(...refund)).toBeCloseTo(1);
    expect(cosineSimilarity(refund, refunds)).toBeGreaterThan(cosineSimilarity(refund, shipping));
    expect(embed('')).toEqual(new Array(64).fill(0));
  });

  it('count tokens at about four characters each, plus overhead per message', () => {
    expect(countTokens('abcdefgh')).toBe(2);
    expect(countTokens([{ role: 'user', content: 'abcd' }])).toBe(5);
  });
});

describe('editor declarations', () => {
  const block = (name: string) => FAKE_MODEL_DECLARATION.split(`declare module '${name}' {`)[1].split(/\ndeclare module|\n}\n*$/)[0];
  const valueExports = (source: string) => [...new Set([...source.matchAll(/export (?:function|class|const) (\w+)/g)].map((match) => match[1]))].sort();

  it('declare every runtime export of @dojo/ai and @dojo/ai/testing', () => {
    const { module, testing } = createFakeModelProvider({ wait: async () => undefined });
    expect(valueExports(block('@dojo/ai'))).toEqual(Object.keys(module).sort());
    expect(valueExports(block('@dojo/ai/testing'))).toEqual(Object.keys(testing).sort());
  });

  it('declare every respond builder and fakeModel member', () => {
    const { testing } = createFakeModelProvider({ wait: async () => undefined });
    const testingBlock = block('@dojo/ai/testing');
    const respondBlock = testingBlock.split('export const respond: {')[1].split('};')[0];
    const fakeModelBlock = testingBlock.split('export interface FakeModel {')[1].split('\n  }')[0];
    expect([...respondBlock.matchAll(/^\s+(\w+)\(/gm)].map((match) => match[1]).sort()).toEqual(Object.keys(testing.respond).sort());
    expect([...fakeModelBlock.matchAll(/^\s+(?:readonly )?(\w+)[(:]/gm)].map((match) => match[1]).sort()).toEqual(Object.keys(testing.fakeModel).sort());
  });
});
