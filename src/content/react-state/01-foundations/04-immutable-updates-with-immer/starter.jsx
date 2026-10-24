import { useReducer, useState } from 'react';

export const initialBoard = {
  columns: [
    {
      id: 'todo',
      title: 'To do',
      cards: [
        { id: 'c1', title: 'Write specs', tags: ['docs'] },
        { id: 'c2', title: 'Design API', tags: [] },
      ],
    },
    { id: 'doing', title: 'Doing', cards: [{ id: 'c3', title: 'Build login', tags: ['frontend'] }] },
    { id: 'done', title: 'Done', cards: [] },
  ],
};

// TODO: rewrite this reducer with a curried produce() from immer: export const boardReducer = produce((draft, action) => { ... })
export function boardReducer(board, action) {
  switch (action.type) {
    case 'cardAdded':
      return {
        ...board,
        columns: board.columns.map((column) =>
          column.id === action.columnId
            ? { ...column, cards: [...column.cards, { id: action.id, title: action.title, tags: [] }] }
            : column,
        ),
      };
    case 'cardMoved': {
      const from = board.columns.find((column) => column.cards.some((card) => card.id === action.cardId));
      const index = from.cards.findIndex((card) => card.id === action.cardId);
      const [card] = from.cards.splice(index, 1);
      return {
        ...board,
        columns: board.columns.map((column) =>
          column.id === action.toColumnId ? { ...column, cards: [...column.cards, card] } : column,
        ),
      };
    }
    case 'cardRenamed':
      return {
        ...board,
        columns: board.columns.map((column) => ({
          ...column,
          cards: column.cards.map((card) => (card.id === action.cardId ? { ...card, title: action.title } : card)),
        })),
      };
    case 'tagToggled': {
      const card = board.columns.flatMap((column) => column.cards).find((entry) => entry.id === action.cardId);
      if (card.tags.includes(action.tag)) {
        card.tags.splice(card.tags.indexOf(action.tag), 1);
      } else {
        card.tags.push(action.tag);
      }
      return { ...board };
    }
    default:
      return board;
  }
}

function NewCardForm({ columns, onAdd }) {
  // TODO: replace useState + spreads with useImmer from 'use-immer'
  const [draft, setDraft] = useState({ title: '', columnId: 'todo' });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.title.trim()) return;
        onAdd(draft.columnId, draft.title.trim());
        setDraft({ ...draft, title: '' });
      }}
    >
      <input aria-label="Card title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
      <select aria-label="Column" value={draft.columnId} onChange={(event) => setDraft({ ...draft, columnId: event.target.value })}>
        {columns.map((column) => (
          <option key={column.id} value={column.id}>
            {column.title}
          </option>
        ))}
      </select>
      <button type="submit">Add card</button>
    </form>
  );
}

export default function KanbanBoard() {
  const [board, dispatch] = useReducer(boardReducer, initialBoard);

  return (
    <main>
      <NewCardForm
        columns={board.columns}
        onAdd={(columnId, title) => dispatch({ type: 'cardAdded', columnId, id: crypto.randomUUID(), title })}
      />
      {board.columns.map((column) => (
        <section key={column.id} aria-label={column.title}>
          <h3>{column.title}</h3>
          <ul>
            {column.cards.map((card) => (
              <li key={card.id}>
                {card.title}
                <select
                  aria-label={`Move ${card.title}`}
                  value={column.id}
                  onChange={(event) => dispatch({ type: 'cardMoved', cardId: card.id, toColumnId: event.target.value })}
                >
                  {board.columns.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
