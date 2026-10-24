const allowedProtocols = ['http:', 'https:', 'mailto:'];
const allowedTags = new Set(['A', 'B', 'BR', 'EM', 'I', 'P', 'STRONG']);

export function isSafeUrl(url) {
  try {
    return allowedProtocols.includes(new URL(url, 'https://dojo.local').protocol);
  } catch {
    return false;
  }
}

export function UserLink({ href, children }) {
  return (
    <a href={isSafeUrl(href) ? href : undefined} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function Comment({ author, text }) {
  return (
    <article>
      <h4>{author}</h4>
      <p>{text}</p>
    </article>
  );
}

function clean(parent) {
  for (const node of [...parent.childNodes]) {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove();
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    if (!allowedTags.has(node.tagName)) {
      node.remove();
      continue;
    }
    for (const attribute of [...node.attributes]) {
      const keep = node.tagName === 'A' && attribute.name === 'href' && isSafeUrl(attribute.value);
      if (!keep) node.removeAttribute(attribute.name);
    }
    clean(node);
  }
}

export function sanitizeHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  clean(template.content);
  return template.innerHTML;
}

export function RichComment({ html }) {
  return <div className="rich-comment" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}

export default function App() {
  return (
    <main>
      <Comment author="Mallory" text={'<img src=x onerror="alert(\'pwned\')"> Nice post!'} />
      <UserLink href="javascript:alert('pwned')">Mallory's website</UserLink>
      <RichComment html={'<strong>Great</strong> lesson! <script>alert(1)</script><a href="https://react.dev" onclick="steal()">docs</a>'} />
    </main>
  );
}
