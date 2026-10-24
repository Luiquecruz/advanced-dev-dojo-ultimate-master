Start with an early return at the top of the component: `if (!isLoggedIn) return <p>Please sign in.</p>;`.
---
The stray `0` comes from `messages.length && ...`: when the length is `0`, the whole expression evaluates to `0`, and React renders numbers. Make the left side a boolean, such as `count > 0 && ...`.
---
For the paragraph, a ternary picks between the two outputs: `count === 0 ? <p>No new messages</p> : <p>You have {count} unread {count === 1 ? 'message' : 'messages'}</p>`.
