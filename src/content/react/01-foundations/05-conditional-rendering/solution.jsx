export default function Inbox({ isLoggedIn, messages }) {
  if (!isLoggedIn) {
    return <p>Please sign in.</p>;
  }

  const count = messages.length;

  return (
    <section>
      <h2>
        Inbox {count > 0 && <span className="badge">{count}</span>}
      </h2>
      {count === 0 ? (
        <p>No new messages</p>
      ) : (
        <p>
          You have {count} unread {count === 1 ? 'message' : 'messages'}
        </p>
      )}
    </section>
  );
}
