import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

function codeOf(source: string): HTMLElement {
  const { container } = render(createElement(Markdown, { source }));
  return container.querySelector('pre code')!;
}

describe('Markdown code blocks', () => {
  it.each(['csharp', 'cs'])('highlights `%s` fences as C#', (fence) => {
    const code = codeOf(`\`\`\`${fence}\npublic sealed record Product(string Sku);\n\`\`\``);
    expect(code.querySelector('.hljs-keyword')?.textContent).toBe('public');
  });

  it('highlights `sql` fences', () => {
    expect(codeOf('```sql\nSELECT sku FROM products;\n```').querySelector('.hljs-keyword')?.textContent).toBe('SELECT');
  });

  it('escapes fences of unregistered languages without highlighting', () => {
    const code = codeOf('```cobol\n<b>MOVE</b>\n```');
    expect(code.querySelector('.hljs-keyword')).toBeNull();
    expect(code.innerHTML).toContain('&lt;b&gt;');
  });
});
