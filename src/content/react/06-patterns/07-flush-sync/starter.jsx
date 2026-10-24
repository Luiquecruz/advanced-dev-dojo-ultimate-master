import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

export default function TodoList() {
  const [todos, setTodos] = useState(['Learn JSX', 'Master hooks']);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  function handleAdd() {
    const title = text.trim();
    if (!title) {
      return;
    }
    // TODO: wrap the state updates in flushSync so the new <li> exists before focusing it
    setTodos([...todos, title]);
    setText('');
    listRef.current.lastElementChild.focus();
  }

  return (
    <section>
      <input aria-label="New todo" value={text} onChange={(event) => setText(event.target.value)} />
      <button onClick={handleAdd}>Add</button>
      <ul ref={listRef}>
        {todos.map((todo) => (
          <li key={todo} tabIndex={-1}>
            {todo}
          </li>
        ))}
      </ul>
    </section>
  );
}
