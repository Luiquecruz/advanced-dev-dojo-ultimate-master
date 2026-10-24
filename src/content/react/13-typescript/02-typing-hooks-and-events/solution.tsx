import { useReducer, useRef, useState } from 'react';
import type { ChangeEvent, SubmitEvent } from 'react';

export type Todo = { id: number; title: string; done: boolean };

export type Action = { type: 'added'; title: string } | { type: 'toggled'; id: number } | { type: 'cleared' };

export function todosReducer(state: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case 'added': {
      const nextId = Math.max(0, ...state.map((todo) => todo.id)) + 1;
      return [...state, { id: nextId, title: action.title, done: false }];
    }
    case 'toggled':
      return state.map((todo) => (todo.id === action.id ? { ...todo, done: !todo.done } : todo));
    case 'cleared':
      return state.filter((todo) => !todo.done);
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

export default function TodoApp() {
  const [todos, dispatch] = useReducer(todosReducer, []);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    dispatch({ type: 'added', title: trimmed });
    setTitle('');
    inputRef.current?.focus();
  }

  return (
    <section>
      <form aria-label="Add todo" onSubmit={handleSubmit}>
        <input ref={inputRef} aria-label="Title" value={title} onChange={handleChange} />
        <button>Add</button>
      </form>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <label>
              <input type="checkbox" checked={todo.done} onChange={() => dispatch({ type: 'toggled', id: todo.id })} /> {todo.title}
            </label>
          </li>
        ))}
      </ul>
      <button onClick={() => dispatch({ type: 'cleared' })}>Clear completed</button>
    </section>
  );
}
