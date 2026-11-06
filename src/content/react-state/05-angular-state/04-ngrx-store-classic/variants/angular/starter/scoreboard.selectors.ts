import { createFeatureSelector, createSelector } from '@ngrx/store';
import { scoreboardFeatureKey, type ScoreboardState } from './scoreboard.reducer';

export const selectScoreboard = createFeatureSelector<ScoreboardState>(scoreboardFeatureKey);

// TODO: selectHome and selectAway (createSelector on selectScoreboard)

// TODO: selectLeader -> 'Home' | 'Away' | 'Tied', composed from selectHome and selectAway

// TODO: selectPlays -> number of entries in history
