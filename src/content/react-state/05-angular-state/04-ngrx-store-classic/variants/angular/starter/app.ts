import { Component, inject } from '@angular/core';
import { Store, provideStore } from '@ngrx/store';
import { gameReset, scored, type Team } from './scoreboard.actions';
import { scoreboardFeatureKey, scoreboardReducer } from './scoreboard.reducer';
import { selectAway, selectHome, selectLeader, selectPlays } from './scoreboard.selectors';

export const appConfig = { providers: [provideStore({ [scoreboardFeatureKey]: scoreboardReducer })] };

@Component({
  selector: 'app-scoreboard',
  template: `
    <p>Home {{ home() }} - {{ away() }} Away</p>
    <p>Leader: {{ leader() }}</p>
    <p>Plays: {{ plays() }}</p>
    <button (click)="score('home', 1)">Home +1</button>
    <button (click)="score('home', 3)">Home +3</button>
    <button (click)="score('away', 1)">Away +1</button>
    <button (click)="score('away', 3)">Away +3</button>
    <button (click)="reset()">Reset</button>
  `,
})
export class Scoreboard {
  private readonly store = inject(Store);

  // TODO: read home, away, leader and plays with this.store.selectSignal(...)
  protected readonly home = () => 0;
  protected readonly away = () => 0;
  protected readonly leader = () => 'Tied';
  protected readonly plays = () => 0;

  score(team: Team, points: number) {
    // TODO: dispatch the scored action
  }

  reset() {
    // TODO: dispatch the gameReset action
  }
}
