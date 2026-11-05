import { describe, expect, it } from 'vitest';
import { stripComments } from './compile';

describe('stripComments', () => {
  it('drops comments from non-script files and keeps code and URLs outside them', () => {
    expect(stripComments('a { b: url(http://x.test/y); } /* c */', 'styles.css')).toBe('a { b: url(http://x.test/y); } ');
    expect(stripComments('<p>a</p><!-- hidden -->', 'index.html')).toBe('<p>a</p>');
  });
});
