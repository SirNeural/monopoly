import Note from "../game/Note";
import globals from "../globals";
import {
  aimTowardAndGetDistance,
  rand,
  isClose,
  minMagnitude,
  resizeRendererToDisplaySize,
  removeArrayElement
} from "./utils";

function* waitFrames(numFrames) {
  // eslint-disable-line no-unused-vars
  while (numFrames > 0) {
    --numFrames;
    yield;
  }
}

function* waitSeconds(duration, deltaTime) {
  while (duration > 0) {
    duration -= deltaTime;
    yield;
  }
}

function* emitNotes(noteGO, subject) {
  for (;;) {
    yield waitSeconds(rand(0.5, 1), globals.deltaTime);
    noteGO.transform.position.copy(subject.gameObject.transform.position);
    noteGO.transform.position.y += 5;
    noteGO.addComponent(Note);
  }
}

export { waitFrames, waitSeconds, emitNotes };
