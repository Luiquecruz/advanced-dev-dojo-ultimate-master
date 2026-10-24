test('isSafeUrl allows http, https, mailto and relative URLs only', () => {
  const { isSafeUrl } = mod;
  expect(isSafeUrl('https://react.dev')).toBe(true);
  expect(isSafeUrl('http://example.com/page')).toBe(true);
  expect(isSafeUrl('mailto:ada@example.com')).toBe(true);
  expect(isSafeUrl('/users/1')).toBe(true);
  expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  expect(isSafeUrl('  JavaScript:alert(1)')).toBe(false);
  expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
});

test('UserLink keeps safe links, drops unsafe ones and sets rel="noopener noreferrer"', () => {
  const { UserLink } = mod;
  render(
    <div>
      <UserLink href="https://react.dev">React</UserLink>
      <UserLink href="data:text/html,<script>alert(1)</script>">Evil</UserLink>
    </div>,
  );
  const safe = screen.getByRole('link', { name: 'React' });
  expect(safe).toHaveAttribute('href', 'https://react.dev');
  expect(safe).toHaveAttribute('target', '_blank');
  expect(safe).toHaveAttribute('rel', 'noopener noreferrer');
  expect(screen.getByText('Evil')).not.toHaveAttribute('href');
});

test('Comment renders user text as plain text, never as HTML', () => {
  const { Comment } = mod;
  const text = '<img src=x onerror="alert(1)"> Nice post!';
  const { container } = render(<Comment author="Mallory" text={text} />);
  expect(container.querySelector('img')).toBeNull();
  expect(screen.getByText(text)).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Mallory');
});

test('sanitizeHtml removes scripts, comments and elements outside the allowlist', () => {
  const { sanitizeHtml } = mod;
  expect(sanitizeHtml('<b>Hi</b><script>alert(1)</script>')).toBe('<b>Hi</b>');
  expect(sanitizeHtml('<img src="x" onerror="alert(1)">ok')).toBe('ok');
  expect(sanitizeHtml('<p><em>nested</em> text<!-- note --></p>')).toBe('<p><em>nested</em> text</p>');
  expect(sanitizeHtml('<iframe src="https://evil.example"></iframe><br>')).toBe('<br>');
});

test('sanitizeHtml strips attributes and keeps only safe hrefs on links', () => {
  const { sanitizeHtml } = mod;
  expect(sanitizeHtml('<a href="javascript:alert(1)" onclick="steal()">x</a>')).toBe('<a>x</a>');
  expect(sanitizeHtml('<a href="https://react.dev" title="docs" style="color:red">docs</a>')).toBe('<a href="https://react.dev">docs</a>');
  expect(sanitizeHtml('<strong onmouseover="steal()">bold</strong>')).toBe('<strong>bold</strong>');
});

test('RichComment renders sanitized formatting', () => {
  const { RichComment } = mod;
  const { container } = render(<RichComment html={'<strong>Great</strong> lesson! <script>alert(1)</script><a href="https://react.dev" onclick="steal()">docs</a>'} />);
  expect(container.querySelector('strong')).toHaveTextContent('Great');
  expect(container.querySelector('script')).toBeNull();
  expect(container.querySelector('[onclick]')).toBeNull();
  expect(screen.getByRole('link', { name: 'docs' })).toHaveAttribute('href', 'https://react.dev');
});
