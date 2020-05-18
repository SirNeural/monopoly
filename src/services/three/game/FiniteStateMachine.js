class FiniteStateMachine {
  constructor(states, initialState) {
    this.states = states;
    this.transition(initialState);
  }
  get state() {
    return this.currentState;
  }
  transition(state) {
    const oldState = this.states[this.currentState];
    if (oldState && oldState.exit) {
      oldState.exit.call(this);
    }
    this.currentState = state;
    const newState = this.states[state];
    if (newState.enter) {
      newState.enter.call(this);
    }
  }
  update() {
    const state = this.states[this.currentState];
    if (state.update) {
      state.update.call(this);
    }
  }
}
export default FiniteStateMachine;
