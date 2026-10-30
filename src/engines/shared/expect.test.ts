import { describe, expect as vitestExpect, it } from 'vitest';
import { expect, fn } from './expect';

class NotFoundError extends Error {}

describe('expect().toThrow', () => {
  const throwNotFound = () => {
    throw new NotFoundError('User 7 not found');
  };

  it('matches a message substring, a RegExp, an error instance or an error class', () => {
    expect(throwNotFound).toThrow('not found');
    expect(throwNotFound).toThrow(/User \d+/);
    expect(throwNotFound).toThrow(new Error('User 7 not found'));
    expect(throwNotFound).toThrow(NotFoundError);
    expect(throwNotFound).not.toThrow(TypeError);
  });

  it('fails when the error is not an instance of the expected class', () => {
    vitestExpect(() => expect(throwNotFound).toThrow(TypeError)).toThrow('Expected an instance of TypeError');
  });
});

describe('fn once variants', () => {
  it('consumes queued values before the default implementation', async () => {
    const mock = fn(() => 'default').mockResolvedValueOnce('first').mockRejectedValueOnce(new Error('second')).mockImplementationOnce(() => 'third');
    await vitestExpect(mock()).resolves.toBe('first');
    await vitestExpect(mock()).rejects.toThrow('second');
    vitestExpect(mock()).toBe('third');
    vitestExpect(mock()).toBe('default');
  });
});
