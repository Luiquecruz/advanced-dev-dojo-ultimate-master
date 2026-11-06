import { useReducer } from 'react';
import { produce } from 'immer';
import { useImmer } from 'use-immer';

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

function findCard(draft, cardId) {
  for (const column of draft.columns) {
    const card = column.cards.find((entry) => entry.id === cardId);
    if (card) return { column, card };
  }
  return null;
}

export const boardReducer = produce((draft, action) => {
  switch (action.type) {
    case 'cardAdded': {
      const column = draft.columns.find((entry) => entry.id === action.columnId);
      column?.cards.push({ id: action.id, title: action.title, tags: [] });
      break;
    }
    case 'cardMoved': {
      const found = findCard(draft, action.cardId);
      const target = draft.columns.find((entry) => entry.id === action.toColumnId);
      if (!found || !target || found.column === target) break;
      found.column.cards.splice(found.column.cards.indexOf(found.card), 1);
      target.cards.push(found.card);
      break;
    }
    case 'cardRenamed': {
      const found = findCard(draft, action.cardId);
      if (found) found.card.title = action.title;
      break;
    }
    case 'tagToggled': {
      const found = findCard(draft, action.cardId);
      if (!found) break;
      const index = found.card.tags.indexOf(action.tag);
      if (index === -1) found.card.tags.push(action.tag);
      else found.card.tags.splice(index, 1);
      break;
    }
  }
});

function NewCardForm({ columns, onAdd }) {
  const [draft, updateDraft] = useImmer({ title: '', columnId: 'todo' });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.title.trim()) return;
        onAdd(draft.columnId, draft.title.trim());
        updateDraft((current) => {
          current.title = '';
        });
      }}
    >
      <input
        aria-label="Card title"
        value={draft.title}
        onChange={(event) =>
          updateDraft((current) => {
            current.title = event.target.value;
          })
        }
      />
      <select
        aria-label="Column"
        value={draft.columnId}
        onChange={(event) =>
          updateDraft((current) => {
            current.columnId = event.target.value;
          })
        }
      >
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
