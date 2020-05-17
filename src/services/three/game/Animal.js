import * as THREE from "three";
import Component from "./Component";
import StateDisplayHelper from "./utils/StateDisplayHelper";
import FiniteStateMachine from "./FiniteStateMachine";
import SkinInstance from "./SkinInstance";
import { isClose, aimTowardAndGetDistance } from "../utils/utils";
import globals from "../globals";

class Animal extends Component {
  constructor(gameObject, model) {
    super(gameObject);
    //console.log(model);

    this.helper = gameObject.addComponent(
      StateDisplayHelper,
      model.size,
      gameObject.globals,
      document.querySelector("#labels")
    );

    const hitRadius = model.size / 2;
    const skinInstance = gameObject.addComponent(SkinInstance, model);
    skinInstance.mixer.timeScale = globals.moveSpeed / 4;
    const transform = gameObject.transform;
    const playerTransform = globals.player.gameObject.transform;
    const maxTurnSpeed = Math.PI * (globals.moveSpeed / 4);
    const targetHistory = [];

    let targetNdx = 0;

    function addHistory() {
      const targetGO = globals.congaLine[targetNdx];
      const newTargetPos = new THREE.Vector3();
      newTargetPos.copy(targetGO.transform.position);
      targetHistory.push(newTargetPos);
    }

    this.fsm = new FiniteStateMachine(
      {
        idle: {
          enter: () => {
            skinInstance.setAnimation("Idle");
          },
          update: () => {
            // check if player is near
            if (
              isClose(
                transform,
                hitRadius,
                playerTransform,
                globals.playerRadius
              )
            ) {
              this.fsm.transition("waitForEnd");
            }
          }
        },
        waitForEnd: {
          enter: () => {
            skinInstance.setAnimation("Jump");
          },
          update: () => {
            // get the gameObject at the end of the conga line
            const lastGO = globals.congaLine[globals.congaLine.length - 1];
            const deltaTurnSpeed = maxTurnSpeed * globals.deltaTime;
            const targetPos = lastGO.transform.position;
            aimTowardAndGetDistance(transform, targetPos, deltaTurnSpeed);
            // check if last thing in conga line is near
            if (
              isClose(
                transform,
                hitRadius,
                lastGO.transform,
                globals.playerRadius
              )
            ) {
              this.fsm.transition("goToLast");
            }
          }
        },
        goToLast: {
          enter: () => {
            // remember who we're following
            targetNdx = globals.congaLine.length - 1;
            // add ourselves to the conga line
            globals.congaLine.push(gameObject);
            skinInstance.setAnimation("Walk");
          },
          update: () => {
            addHistory();
            // walk to the oldest point in the history
            const targetPos = targetHistory[0];
            const maxVelocity = globals.moveSpeed * globals.deltaTime;
            const deltaTurnSpeed = maxTurnSpeed * globals.deltaTime;
            const distance = aimTowardAndGetDistance(
              transform,
              targetPos,
              deltaTurnSpeed
            );
            const velocity = distance;
            transform.translateOnAxis(
              globals.kForward,
              Math.min(velocity, maxVelocity)
            );
            if (distance <= maxVelocity) {
              this.fsm.transition("follow");
            }
          }
        },
        follow: {
          update: () => {
            addHistory();
            // remove the oldest history and just put ourselves there.
            const targetPos = targetHistory.shift();
            transform.position.copy(targetPos);
            const deltaTurnSpeed = maxTurnSpeed * globals.deltaTime;
            aimTowardAndGetDistance(
              transform,
              targetHistory[0],
              deltaTurnSpeed
            );
          }
        }
      },
      "idle"
    );
  }

  update() {
    this.fsm.update();
    const dir = THREE.Math.radToDeg(this.gameObject.transform.rotation.y);
    this.helper.setState(`${this.fsm.state}:${dir.toFixed(0)}`);
  }
}

export default Animal;
