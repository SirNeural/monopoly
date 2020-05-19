import Component from "./Component";
import SkinInstance from "./SkinInstance";

class Animal extends Component {
  constructor(gameObject, model, globals) {
    super(gameObject);
    //console.log(model);
    
    const skinInstance = gameObject.addComponent(SkinInstance, model, globals);
    this.skinInstance = skinInstance;
    this.skinInstance.mixer.timeScale = globals.moveSpeed / 4;
    this.skinInstance.setAnimation("Idle")
  }

  setAnimation(name) {
      this.skinInstance.setAnimation(name, (name == "Death"));
  }

  update() {
    
  }
}

export default Animal;
