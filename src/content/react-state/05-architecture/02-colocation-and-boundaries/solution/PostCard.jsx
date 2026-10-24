import { useState } from 'react';

function CommentBox({ title, onSubmit }) {
  const [draft, setDraft] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(draft.trim());
    setDraft('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Comment on {title}
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
      </label>
      <button type="submit" disabled={draft.trim() === ''}>
        Post comment
      </button>
    </form>
  );
}

export function PostCard({ post }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState([]);

  return (
    <article aria-label={post.title}>
      <h2>{post.title}</h2>
      {isExpanded && <p>{post.body}</p>}
      <button onClick={() => setIsExpanded((expanded) => !expanded)}>{isExpanded ? 'Show less' : 'Read more'}</button>
      <ul aria-label="Comments">
        {comments.map((comment, index) => (
          <li key={index}>{comment}</li>
        ))}
      </ul>
      <CommentBox title={post.title} onSubmit={(comment) => setComments((current) => [...current, comment])} />
    </article>
  );
}
