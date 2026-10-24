import { createListenerMiddleware } from '@reduxjs/toolkit';
import { notificationAdded } from './notificationsSlice';
import { selectTodoById, todoToggled, todoToggleReverted } from './todosSlice';

export const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  actionCreator: todoToggled,
  effect: async (action, listenerApi) => {
    const todo = selectTodoById(listenerApi.getState(), action.payload);
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: todo.completed }),
      });
      if (!response.ok) {
        throw new Error('Save failed');
      }
    } catch {
      listenerApi.dispatch(todoToggleReverted(todo.id));
      listenerApi.dispatch(notificationAdded(`Could not save "${todo.title}"`));
    }
  },
});
