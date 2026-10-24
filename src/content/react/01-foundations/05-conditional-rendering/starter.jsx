export default function Inbox({ isLoggedIn, messages }) {
  // TODO: when the user is not logged in, return <p>Please sign in.</p>

  return (
    <section>
      <h2>
        Inbox {messages.length && <span className="badge">{messages.length}</span>}
      </h2>
      {/* TODO: "No new messages" when empty, otherwise "You have N unread message(s)" with the right plural */}
      {messages.length && <p>You have {messages.length} unread messages</p>}
    </section>
  );
}
