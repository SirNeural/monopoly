import * as THREE from "three";

import { removeArrayElement } from "../utils/utils";

class GameObject {
  constructor(parent, name, globals) {
    this.name = name;
    this.components = [];
    this.transform = new THREE.Object3D();
    this.transform.rotation.x = Math.PI / 2;
    this.transform.scale.multiplyScalar(2);
    this.transform.name = name;
    this.parent = parent;
    this.globals = globals;
    parent.add(this.transform);
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
