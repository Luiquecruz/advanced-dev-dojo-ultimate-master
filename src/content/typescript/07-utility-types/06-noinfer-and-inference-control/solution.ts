interface StateMachine<TState extends string> {
  readonly current: TState;
  transition(to: TState): void;
  history(): TState[];
}

function createStateMachine<TState extends string>(states: readonly TState[], initial: NoInfer<TState>): StateMachine<TState> {
  const visited: TState[] = [initial];
  return {
    get current() {
      return visited[visited.length - 1];
    },
    transition(to) {
      if (!states.includes(to)) {
        throw new Error(`Unknown state: ${to}`);
      }
      visited.push(to);
    },
    history() {
      return [...visited];
    },
  };
}

function parseOption<TOption extends string>(allowed: readonly TOption[], input: string, fallback: NoInfer<TOption>): TOption {
  const match = allowed.find((option) => option === input);
  return match ?? fallback;
}
