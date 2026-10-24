interface StateMachine<TState extends string> {
  readonly current: TState;
  transition(to: TState): void;
  history(): TState[];
}

// TODO: prevent initial from widening TState
function createStateMachine<TState extends string>(states: readonly TState[], initial: TState): StateMachine<TState> {
  const visited: TState[] = [initial];
  return {
    get current() {
      return visited[visited.length - 1];
    },
    transition(to) {
      // TODO: throw "Unknown state: <to>" when to is not in states, otherwise record it
    },
    history() {
      return [...visited];
    },
  };
}

// TODO: prevent fallback from widening TOption and return the right value
function parseOption<TOption extends string>(allowed: readonly TOption[], input: string, fallback: TOption): TOption {
  return fallback;
}
