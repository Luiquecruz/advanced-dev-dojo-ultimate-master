import { describe, expect, it } from 'vitest';
import { stripComments } from './compile';

describe('stripComments', () => {
  it('removes comments that a single pass would rebuild from their own fragments', () => {
    expect(stripComments('<p>a</p><!<!---->-- hidden -->', 'index.html')).toBe('<p>a</p>');
    expect(stripComments('a /*/* x */*/ b', 'styles.css')).not.toContain('/*');
  });

  it('keeps code and URLs outside comments', () => {
    expect(stripComments('a { b: url(http://x.test/y); } /* c */', 'styles.css')).toBe('a { b: url(http://x.test/y); } ');
  });
});
