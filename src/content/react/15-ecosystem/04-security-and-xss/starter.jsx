const allowedProtocols = ['http:', 'https:', 'mailto:'];
const allowedTags = new Set(['A', 'B', 'BR', 'EM', 'I', 'P', 'STRONG']);

export function isSafeUrl(url) {
  // TODO: parse the url (relative to https://dojo.local) and allow only the allowed protocols
  return true;
}

export function UserLink({ href, children }) {
  // TODO: drop unsafe hrefs and protect window.opener with rel
  return (
    <a href={href} target="_blank">
      {children}
    </a>
  );
}

export function Comment({ author, text }) {
  return (
    <article>
      <h4>{author}</h4>
      {/* TODO: render the text as text, not as HTML */}
      <p dangerouslySetInnerHTML={{ __html: text }} />
    </article>
  );
}

export function sanitizeHtml(html) {
  // TODO: parse into a <template>, remove comments and elements outside allowedTags,
  // and remove every attribute except a safe href on <a>
  return html;
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
