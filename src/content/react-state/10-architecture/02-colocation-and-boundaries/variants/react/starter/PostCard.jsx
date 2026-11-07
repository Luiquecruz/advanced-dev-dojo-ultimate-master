import { useState } from 'react';
import { useAppStore } from './store';

function CommentBox({ title, onSubmit }) {
  // TODO: the draft belongs to this box only: keep it in local state
  const draft = useAppStore((state) => state.commentDraft);
  const setDraft = useAppStore((state) => state.setCommentDraft);

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
  // TODO: expansion is per card: keep it in local state instead of a global expandedPostId
  const expandedPostId = useAppStore((state) => state.expandedPostId);
  const setExpandedPostId = useAppStore((state) => state.setExpandedPostId);
  const isExpanded = expandedPostId === post.id;
  const [comments, setComments] = useState([]);

  return (
    <article aria-label={post.title}>
      <h2>{post.title}</h2>
      {isExpanded && <p>{post.body}</p>}
      <button onClick={() => setExpandedPostId(isExpanded ? null : post.id)}>{isExpanded ? 'Show less' : 'Read more'}</button>
      <ul aria-label="Comments">
        {comments.map((comment, index) => (
          <li key={index}>{comment}</li>
        ))}
      </ul>
      <CommentBox title={post.title} onSubmit={(comment) => setComments((current) => [...current, comment])} />
    </article>
  );
}
