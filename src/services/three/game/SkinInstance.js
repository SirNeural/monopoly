import Component from "./Component";
import * as THREE from "three";
import {
  SkeletonUtils
} from "three/examples/jsm/utils/SkeletonUtils";

class SkinInstance extends Component {
  constructor(gameObject, model, globals) {
    super(gameObject);
    this.model = model;
    this.animRoot = SkeletonUtils.clone(this.model.gltf.scene);
    this.mixer = new THREE.AnimationMixer(this.animRoot);
    gameObject.transform.add(this.animRoot);
    this.actions = {};
    this.globals = globals;
  }

  setAnimation(animName, clamp = false) {
    const clip = this.model.animations[animName];
    // turn off all current actions
    for (const action of Object.values(this.actions)) {
      action.enabled = false;
    }
    // get or create existing action for clip
    const action = this.mixer.clipAction(clip);
    action.enabled = true;
    action.clampWhenFinished = clamp;
    action.loop = clamp ? THREE.LoopOnce : THREE.LoopRepeat;
    action.reset();
    action.play();
    this.actions[animName] = action;
  }

  update() {
    this.mixer.update(this.globals.deltaTime);
  }
}

export default SkinInstance;
