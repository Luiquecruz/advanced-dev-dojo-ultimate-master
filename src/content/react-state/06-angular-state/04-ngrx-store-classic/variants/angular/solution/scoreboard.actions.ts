import { createAction, props } from '@ngrx/store';

export type Team = 'home' | 'away';

export const scored = createAction('[Scoreboard] Scored', props<{ team: Team; points: number }>());

export const gameReset = createAction('[Scoreboard] Game Reset');
