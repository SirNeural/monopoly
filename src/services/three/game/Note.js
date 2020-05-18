import * as THREE from "three";
import Component from "./Component";
import CoroutineRunner from "./CoroutineRunner";
import { rand } from "../utils/utils";

function makeTextTexture(str) {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.canvas.width = 64;
  ctx.canvas.height = 64;
  ctx.font = "60px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFF";
  ctx.fillText(str, ctx.canvas.width / 2, ctx.canvas.height / 2);
  return new THREE.CanvasTexture(ctx.canvas);
}

const noteTexture = makeTextTexture("♪");

class Note extends Component {
  constructor(gameObject, globals) {
    super(gameObject);
    const { transform } = gameObject;
    const noteMaterial = new THREE.SpriteMaterial({
      color: new THREE.Color().setHSL(rand(1), 1, 0.5),
      map: noteTexture,
      side: THREE.DoubleSide,
      transparent: true
    });

    const note = new THREE.Sprite(noteMaterial);
    note.scale.setScalar(3);
    transform.add(note);
    this.runner = new CoroutineRunner(globals);
    const direction = new THREE.Vector3(rand(-0.2, 0.2), 1, rand(-0.2, 0.2));

    function* moveAndRemove() {
      for (let i = 0; i < 60; ++i) {
        transform.translateOnAxis(direction, globals.deltaTime * 10);
        noteMaterial.opacity = 1 - i / 60;
        yield;
      }
      transform.parent.remove(transform);
      globals.gameObjectManager.removeGameObject(gameObject);
    }

    this.runner.add(moveAndRemove());
  }
  update() {
    this.runner.update();
  }
}

export default Note;
