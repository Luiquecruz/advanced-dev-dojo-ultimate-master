import { createReducer, on } from '@ngrx/store';
import { gameReset, scored, type Team } from './scoreboard.actions';

export const scoreboardFeatureKey = 'scoreboard';

export interface ScoreboardState {
  home: number;
  away: number;
  history: Array<{ team: Team; points: number }>;
}

export const initialState: ScoreboardState = { home: 0, away: 0, history: [] };

export const scoreboardReducer = createReducer(
  initialState,
  on(scored, (state, { team, points }) => ({
    ...state,
    [team]: state[team] + points,
    history: [...state.history, { team, points }],
  })),
  on(gameReset, () => initialState),
);
