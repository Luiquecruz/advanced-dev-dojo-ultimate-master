import { createListenerMiddleware } from '@reduxjs/toolkit';
import { notificationAdded } from './notificationsSlice';
import { selectTodoById, todoToggled, todoToggleReverted } from './todosSlice';

export const listenerMiddleware = createListenerMiddleware();

// TODO: listen to todoToggled and PATCH /api/todos/:id with { completed } from the new state
// TODO: on a failed request, dispatch todoToggleReverted(id) and notificationAdded('Could not save "<title>"')
