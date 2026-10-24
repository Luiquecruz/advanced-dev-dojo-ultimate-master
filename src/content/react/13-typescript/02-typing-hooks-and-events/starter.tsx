import { useReducer, useRef, useState } from 'react';
import type { ChangeEvent, SubmitEvent } from 'react';

// TODO: export the Todo type

// TODO: export the Action discriminated union ('added' | 'toggled' | 'cleared')

export function todosReducer(state: any, action: any) {
  // TODO: handle 'added', 'toggled' and 'cleared' with a switch, and add a `never` exhaustiveness check
  return state;
}

export default function TodoApp() {
  const [todos, dispatch] = useReducer(todosReducer, []);
  const [title, setTitle] = useState('');
  // TODO: create a typed ref for the input

  // TODO: type the event with ChangeEvent<HTMLInputElement>
  function handleChange(event: any) {
    setTitle(event.target.value);
  }

  // TODO: type the event with SubmitEvent<HTMLFormElement>, dispatch 'added', clear and focus the input
  function handleSubmit(event: any) {
    event.preventDefault();
  }

  return (
    <section>
      <form aria-label="Add todo" onSubmit={handleSubmit}>
        <input aria-label="Title" value={title} onChange={handleChange} />
        <button>Add</button>
      </form>
      <ul>
        {/* TODO: render each todo with a checkbox that dispatches 'toggled' */}
      </ul>
      {/* TODO: add the "Clear completed" button */}
    </section>
  );
}
