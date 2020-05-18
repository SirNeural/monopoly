import Component from "./Component";
import StateDisplayHelper from "./utils/StateDisplayHelper";
import CoroutineRunner from "./CoroutineRunner";
import SkinInstance from "./SkinInstance";

class Player extends Component {
  constructor(gameObject, models, globals) {
    super(gameObject);
    this.gameObject = gameObject;
    const model = models.knight;
    globals.playerRadius = model.size / 2;
    this.text = gameObject.addComponent(
      StateDisplayHelper,
      model.size,
      globals,
      document.querySelector("#labels")
    );

    this.skinInstance = this.gameObject.addComponent(SkinInstance, model, globals);
    this.skinInstance.setAnimation("Run");
    this.turnSpeed = globals.moveSpeed / 4;
    this.offscreenTimer = 0;
    this.maxTimeOffScreen = 3;
    this.runner = new CoroutineRunner(globals);

    //this.runner.add(emitNotes());
  }

  update() {
    this.runner.update();
    const { deltaTime, moveSpeed, cameraInfo } = globals;
    const { transform } = this.gameObject;
    const { inputManager } = this;
    const delta =
      (inputManager.keys.left.down ? 1 : 0) +
      (inputManager.keys.right.down ? -1 : 0);

    transform.rotation.y += this.turnSpeed * delta * deltaTime;
    transform.translateOnAxis(globals.kForward, moveSpeed * deltaTime);

    const { frustum } = cameraInfo;
    if (frustum.containsPoint(transform.position)) {
      this.offscreenTimer = 0;
    } else {
      this.offscreenTimer += deltaTime;
      if (this.offscreenTimer >= this.maxTimeOffScreen) {
        transform.position.set(0, 0, 0);
      }
    }
  }
}

export default Player;
