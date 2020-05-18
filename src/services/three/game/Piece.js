import Component from "./Component";
import SkinInstance from "./SkinInstance";


class Piece extends Component {
    constructor(gameObject, model, globals) {
        super(gameObject);
        //console.log(model);

        const skinInstance = gameObject.addComponent(SkinInstance, model, globals);
        skinInstance.mixer.timeScale = globals.moveSpeed / 4;
        skinInstance.setAnimation("Walk")
    }

    update() {
        
    }
}

export default Piece;
