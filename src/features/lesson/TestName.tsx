/**
 * Renders a test name as plain text, turning `backtick` segments into code.
 */
export function TestName({ name }: { name: string }) {
  return (
    <span className="markdown-inline">
      {name.split(/(`[^`]+`)/).map((part, index) => (part.startsWith('`') && part.endsWith('`') && part.length > 1 ? <code key={index}>{part.slice(1, -1)}</code> : part))}
    </span>
  );
}
