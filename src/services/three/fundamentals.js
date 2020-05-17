import * as THREE from "three";
import {
  GLTFLoader
} from "three/examples/jsm/loaders/GLTFLoader";
import {
  SkeletonUtils
} from "three/examples/jsm/utils/SkeletonUtils";
import InputManager from "./utils/InputManager";
import globals from "./globals";

import Component from "./game/Component";
import CoroutineRunner from "./game/CoroutineRunner";
import FiniteStateMachine from "./game/FiniteStateMachine";
import GameObjectManager from "./game/GameObjectManager";
import SkinInstance from "./game/SkinInstance";
import Player from "./game/Player";
import Animal from "./game/Animal";
import StateDisplayHelper from "./game/utils/StateDisplayHelper";
import CameraInfo from "./game/utils/CameraInfo";

import { waitFrames, waitSeconds, emitNotes } from "./utils/corutines";
import {
  aimTowardAndGetDistance,
  rand,
  isClose,
  minMagnitude,
  resizeRendererToDisplaySize,
  removeArrayElement
} from "./utils/utils";
import {
  OrbitControls
} from "three/examples/jsm/controls/OrbitControls.js";

function main() {
  const canvas = document.querySelector("#c");
  const renderer = new THREE.WebGLRenderer({ canvas });
  const fov = 45;
  const aspect = 2; // the canvas default
  const near = 0.1;
  const far = 1000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

  globals.canvas = canvas;
  globals.camera = camera;

  camera.position.set(0, 40, 80);

  const controls = new OrbitControls(camera, canvas);
  controls.enableKeys = false;
  controls.target.set(0, 5, 0);
  controls.update();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("white");

  function addLight(...pos) {
    const color = 0xffffff;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...pos);
    scene.add(light);
    scene.add(light.target);
  }

  addLight(5, 5, 2);
  addLight(-5, 5, 5);

  const manager = new THREE.LoadingManager();
  manager.onLoad = init;

  const progressbarElem = document.querySelector("#progressbar");
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    progressbarElem.style.width = `${((itemsLoaded / itemsTotal) * 100) | 0}%`;
  };

  const models = {
    pig: {
      url:
        "https://threejsfundamentals.org/threejs/resources/models/animals/Pig.gltf"
    },

    llama: {
      url:
        "https://threejsfundamentals.org/threejs/resources/models/animals/Llama.gltf"
    },
    pug: {
      url:
        "https://threejsfundamentals.org/threejs/resources/models/animals/Pug.gltf"
    },
    sheep: {
      url:
        "https://threejsfundamentals.org/threejs/resources/models/animals/Sheep.gltf"
    },
    zebra: {
      url:
        "https://threejsfundamentals.org/threejs/resources/models/animals/Zebra.gltf"
    },
    horse: {
      url:
        "https://threejsfundamentals.org/threejs/resources/models/animals/Horse.gltf"
    },
    knight: {
      url:
        "https://threejsfundamentals.org/threejs/resources/models/knight/KnightCharacter.gltf"
    }
  };

  {
    const gltfLoader = new GLTFLoader(manager);
    for (const model of Object.values(models)) {
      gltfLoader.load(model.url, gltf => {
        model.gltf = gltf;
      });
    }
  }

  function prepModelsAndAnimations() {
    const box = new THREE.Box3();
    const size = new THREE.Vector3();

    Object.values(models).forEach(model => {
      box.setFromObject(model.gltf.scene);
      box.getSize(size);
      model.size = size.length();
      const animsByName = {};

      model.gltf.animations.forEach(clip => {
        animsByName[clip.name] = clip;
        // Should really fix this in .blend file
        if (clip.name === "Walk") {
          clip.duration /= 2;
        }
      });
      model.animations = animsByName;
    });
  }

  const gameObjectManager = new GameObjectManager();
  const inputManager = new InputManager(canvas);

  // true index

  function init() {
    // hide the loading bar
    const loadingElem = document.querySelector("#loading");
    loadingElem.style.display = "none";
    globals.gameObjectManager = gameObjectManager;
    prepModelsAndAnimations();

    {
      const gameObject = gameObjectManager.createGameObject(
        camera,
        "camera",
        globals
      );
      globals.cameraInfo = gameObject.addComponent(CameraInfo);
    }
    const noteGO = gameObjectManager.createGameObject(scene, "note");
    {
      const gameObject = gameObjectManager.createGameObject(
        scene,
        "player",
        globals
      );

      globals.player = gameObject.addComponent(Player, models);

      globals.player.runner.add(emitNotes(noteGO, globals.player));
      globals.player.inputManager = inputManager;

      globals.congaLine = [gameObject];
    }

    const animalModelNames = ["pig", "llama", "pug", "sheep", "zebra", "horse"];
    const base = new THREE.Object3D();
    const offset = new THREE.Object3D();
    base.add(offset);

    // position animals in a spiral.
    const numAnimals = 28;
    const arc = 10;
    const b = 10 / (2 * Math.PI);
    let r = 10;
    let phi = r / b;
    for (let i = 0; i < numAnimals; ++i) {
      const name = animalModelNames[rand(animalModelNames.length) | 0];
      const gameObject = gameObjectManager.createGameObject(
        scene,
        name,
        globals
      );
      gameObject.addComponent(Animal, models[name]);
      base.rotation.y = phi;
      offset.position.x = r;
      offset.updateWorldMatrix(true, false);
      offset.getWorldPosition(gameObject.transform.position);
      phi += arc / r;
      r = b * phi;
    }
  }

  let then = 0;

  function render(now) {
    // convert to seconds
    globals.time = now * 0.001;
    // make sure delta time isn't too big.
    globals.deltaTime = Math.min(globals.time - then, 1 / 20);
    then = globals.time;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    gameObjectManager.update();
    inputManager.update();

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
