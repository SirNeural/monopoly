import * as THREE from "three";
import TWEEN from '@tweenjs/tween.js';

import { removeArrayElement } from "../utils/utils";

class GameObject {
  constructor(parent, name, globals) {
    this.name = name;
    this.components = [];
    this.transform = new THREE.Object3D();
    this.transform.rotation.x = Math.PI / 2;
    if(name == "llama" || name == "pug")
      this.transform.scale.multiplyScalar(2);
    else if (name == "sheep" || name == "horse" || name == "zebra")
      this.transform.scale.multiplyScalar(1.5);
    this.transform.scale.multiplyScalar(2);
    this.transform.name = name;
    this.parent = parent;
    this.globals = globals;
    parent.add(this.transform);
  }

  move (position) {
    return new Promise((resolve) => {
      let coords = { x: this.transform.position.x, y: this.transform.position.y };
      new TWEEN.Tween(coords)
        .to({ x: position.x, y: position.y }, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate((coords) => {
          this.transform.position.copy(new THREE.Vector3(coords.x, coords.y, this.transform.position.z));
        })
        .onComplete((coords) => {
          resolve(coords)
        })
        .start();
    })
  }

  moveArray (steps) {
    return new Promise((resolve) => {
      let coords = { x: this.transform.position.x, y: this.transform.position.y };
      let tweens = steps.map(step => {
        return new TWEEN.Tween(coords)
          .to({
            x: step.x,
            y: step.y
          }, 500)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onUpdate((coords) => {
            this.transform.position.copy(new THREE.Vector3(coords.x, coords.y, this.transform.position.z));
          });
      });
      for (let i = 0; i < tweens.length - 1; i++) {
        tweens[i].chain(tweens[i + 1]);
      }
      tweens[tweens.length - 1].onComplete((coords) => {
          resolve(coords)
      })
      tweens[0].start();
    });
  }

  rotate(angle) {
    this.transform.rotate(angle);
  }

  addComponent(ComponentType, ...args) {
    const component = new ComponentType(this, ...args);
    this.components.push(component);
    return component;
  }

  removeComponent(component) {
    removeArrayElement(this.components, component);
  }

  getComponent(ComponentType) {
    return this.components.find(c => c instanceof ComponentType);
  }

  update() {
    for (const component of this.components) {
      component.update();
    }
  }
}

export default GameObject;
