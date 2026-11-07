import { createFeatureSelector, createSelector } from '@ngrx/store';
import { scoreboardFeatureKey, type ScoreboardState } from './scoreboard.reducer';

export const selectScoreboard = createFeatureSelector<ScoreboardState>(scoreboardFeatureKey);

export const selectHome = createSelector(selectScoreboard, (state) => state.home);

export const selectAway = createSelector(selectScoreboard, (state) => state.away);

export const selectLeader = createSelector(selectHome, selectAway, (home, away) =>
  home > away ? 'Home' : away > home ? 'Away' : 'Tied',
);

export const selectPlays = createSelector(selectScoreboard, (state) => state.history.length);
