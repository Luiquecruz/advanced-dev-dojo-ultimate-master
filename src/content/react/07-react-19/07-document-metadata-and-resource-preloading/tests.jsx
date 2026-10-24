const article = { slug: 'react-19-metadata', title: 'React 19 Metadata', excerpt: 'Titles and meta tags without effects.' };
const otherArticle = { slug: 'actions', title: 'Actions', excerpt: 'Async transitions explained.' };

test('sets the document title to "{title} | Dev Dojo"', () => {
  const ArticlePage = mod.default;
  render(<ArticlePage article={article} />);
  expect(document.title).toBe('React 19 Metadata | Dev Dojo');
});

test('hoists the description <meta> and canonical <link> into <head>', () => {
  const ArticlePage = mod.default;
  render(<ArticlePage article={article} />);
  const meta = document.head.querySelector('meta[name="description"]');
  const canonical = document.head.querySelector('link[rel="canonical"]');
  expect(meta).toHaveAttribute('content', 'Titles and meta tags without effects.');
  expect(canonical).toHaveAttribute('href', 'https://devdojo.dev/articles/react-19-metadata');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('React 19 Metadata');
});

test('updates the metadata when the article changes and removes it on unmount', () => {
  const ArticlePage = mod.default;
  const { rerender, unmount } = render(<ArticlePage article={article} />);
  rerender(<ArticlePage article={otherArticle} />);
  expect(document.title).toBe('Actions | Dev Dojo');
  expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute('content', 'Async transitions explained.');
  unmount();
  expect(document.head.querySelector('meta[name="description"]')).toBeNull();
});

test('calls preconnect and preload from react-dom during render', () => {
  const reactDom = require('react-dom');
  const originalPreconnect = reactDom.preconnect;
  const originalPreload = reactDom.preload;
  const preconnectSpy = fn();
  const preloadSpy = fn();
  reactDom.preconnect = preconnectSpy;
  reactDom.preload = preloadSpy;
  try {
    const ArticlePage = mod.default;
    render(<ArticlePage article={article} />);
  } finally {
    reactDom.preconnect = originalPreconnect;
    reactDom.preload = originalPreload;
  }
  expect(preconnectSpy).toHaveBeenCalledWith('https://api.example.com');
  expect(preloadSpy).toHaveBeenCalledWith('/fonts/inter.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
});

test('does not manipulate document or use effects', () => {
  expect(source).not.toMatch(/document\.|useEffect|useLayoutEffect/);
});
