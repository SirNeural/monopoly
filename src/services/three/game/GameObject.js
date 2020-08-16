import * as THREE from "three";

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
    this.transform.position.copy(position);
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
