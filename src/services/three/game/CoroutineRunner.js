import { waitSeconds } from "../utils/utils";

class CoroutineRunner {
  constructor(globals) {
    this.generatorStacks = [];
    this.addQueue = [];
    this.removeQueue = new Set();
    this.globals = globals;
  }

  isBusy() {
    return this.addQueue.length + this.generatorStacks.length > 0;
  }

  add(generator, delay = 0) {
    const genStack = [generator];
    if (delay) {
      genStack.push(waitSeconds(delay, this.globals.deltaTime));
    }
    this.addQueue.push(genStack);
  }

  remove(generator) {
    this.removeQueue.add(generator);
  }

  update() {
    this._addQueued();
    this._removeQueued();
    for (const genStack of this.generatorStacks) {
      const main = genStack[0];
      // Handle if one coroutine removes another
      if (this.removeQueue.has(main)) {
        continue;
      }
      while (genStack.length) {
        const topGen = genStack[genStack.length - 1];
        const { value, done } = topGen.next();
        if (done) {
          if (genStack.length === 1) {
            this.removeQueue.add(topGen);
            break;
          }
          genStack.pop();
        } else if (value) {
          genStack.push(value);
        } else {
          break;
        }
      }
    }
    this._removeQueued();
  }

  _addQueued() {
    if (this.addQueue.length) {
      this.generatorStacks.splice(
        this.generatorStacks.length,
        0,
        ...this.addQueue
      );
      this.addQueue = [];
    }
  }

  _removeQueued() {
    if (this.removeQueue.size) {
      this.generatorStacks = this.generatorStacks.filter(
        genStack => !this.removeQueue.has(genStack[0])
      );
      this.removeQueue.clear();
    }
  }
}

export default CoroutineRunner;
