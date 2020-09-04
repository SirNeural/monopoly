<template>
  <div class="min-h-screen flex flex-row justify-between">
    <div
      class="table container mx-auto select-none w-auto h-auto mt-2 transition duration-200 subpixel-antialiased"
      ref="table"
    >
      <div class="transition duration-200 shadow-xl">
        <!--
                    <font-awesome-icon
                        :icon="avatar"
                        size="6x"
                        class="transition duration-200 ease-in-out anti-3d"
                    />
        -->
        <div class="board bg-black border-2 border-black darken">
          <slot></slot>
        </div>
      </div>
    </div>

    <div class="flex flex-col flex-wrap min-h-screen justify-around m-8 pb-12" ref="control">
      <div class="flex flex-col items-start">
        <button
          v-show="ready && !connection.running"
          class="p-2 select-none text-xl text-white"
          @click="joinRoom"
        >Join Room</button>
        <button
          v-show="ready && !connection.running"
          class="p-2 select-none text-xl text-white"
          @click="createRoom"
        >Create Room</button>
        <button
          v-show="ready && host && !connection.running"
          class="p-2 select-none text-xl text-white"
          @click="startGame"
        >Start Game</button>
        <button class="p-2 select-none text-xl text-white" @click="rotate">Rotate</button>
        <button
          class="p-2 select-none text-xl text-white"
          @click="nextState"
          v-show="isCurrentPlayer"
        >Next State</button>
      </div>
      <div class="flex flex-col items-end">
        <div
          class="flex flex-row normal-case select-none py-2"
          v-for="player in state.players"
          :key="player.name"
        >
          <span class="text-white text-lg">{{ player.name }}:</span>
          <span class="ml-1 text-white text-xl">${{ player.balance.toString() }}</span>
        </div>
      </div>
      <div class="text-lg text-white normal-case">
        <div>{{ positionTypeStr }}</div>
        <div>{{ currentPlayer.name }}</div>
        <div
          v-hide="
            state.positionType == 0 || state.positionType == 5 ||
              !dice.every((dice) => dice.isFinished())
          "
        >
          Last Roll:
          {{ lastRoll.join(", ") }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
require("@statechannels/iframe-channel-provider");
import { PositionType } from "../definitions/types";
import { mapGetters, mapState } from "vuex";
import TWEEN from "@tweenjs/tween.js";
import * as THREE from "three";
import * as CANNON from "cannon";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DiceManager, DiceD6 } from "../services/three/utils/dice";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
// import { SkeletonUtils } from "three/examples/jsm/utils/SkeletonUtils";
import GameObjectManager from "../services/three/game/GameObjectManager";
import Animal from "../services/three/game/Animal";
// import CameraInfo from "../services/three/game/utils/CameraInfo";
// import { emitNotes } from "../services/three/utils/corutines";
// import {
//   rand,
// } from "../services/three/utils/utils";

import {
  CSS3DObject,
  CSS3DSprite,
  CSS3DRenderer,
} from "three/examples/jsm/renderers/CSS3DRenderer.js";
export default {
  data() {
    return {
      ready: false,
      angle: 0,
      host: false,
      world: {},
      dice: [],
      pieces: new Map(),
      three: {
        scenes: {},
        renderers: {},
        board: {},
        mixers: [],
        globals: {
          debug: false,
          time: 0,
          moveSpeed: 16,
          deltaTime: 0,
        },
        then: 0,
      },
      models: {
        pig: {
          url:
            "https://threejsfundamentals.org/threejs/resources/models/animals/Pig.gltf",
        },
        cow: {
          url:
            "https://threejsfundamentals.org/threejs/resources/models/animals/Cow.gltf",
        },
        llama: {
          url:
            "https://threejsfundamentals.org/threejs/resources/models/animals/Llama.gltf",
        },
        pug: {
          url:
            "https://threejsfundamentals.org/threejs/resources/models/animals/Pug.gltf",
        },
        sheep: {
          url:
            "https://threejsfundamentals.org/threejs/resources/models/animals/Sheep.gltf",
        },
        zebra: {
          url:
            "https://threejsfundamentals.org/threejs/resources/models/animals/Zebra.gltf",
        },
        horse: {
          url:
            "https://threejsfundamentals.org/threejs/resources/models/animals/Horse.gltf",
        },
        knight: {
          url:
            "https://threejsfundamentals.org/threejs/resources/models/knight/KnightCharacter.gltf",
        },
      },
    };
  },
  props: ["elements"],
  computed: {
    ...mapGetters({
      connection: "getConnection",
      self: "getSelfAddress",
      lastRoll: "getDiceRoll",
      currentPlayer: "getCurrentPlayer",
      position: "getCurrentPlayerPosition",
      username: "getSelfUsername",
      isCurrentPlayer: "getSelfIsCurrentPlayer",
    }),
    ...mapState(["state"]),
    positionTypeStr() {
      return PositionType[this.state.positionType];
    },
  },
  watch: {
    // position(value, old) {
    //   let delta = Math.floor(value / 10) - Math.floor(old / 10);
    //   if (delta < 0) {
    //     delta += 4;
    //   }
    //   this.angle -= (Math.PI * delta) / 2;
    //   this.elements[value].componentInstance.active = true;
    //   this.elements[old].componentInstance.active = false;
    //   this.elements[value].componentInstance.popup();
    // },
    angle(value, old) {
      this.three.controls.rotate(value - old);
      this.three.controls.update();
    },
  },
  methods: {
    rotate() {
      // console.log("rotating");
      this.three.controls.rotate(Math.PI / 2);
      this.three.controls.update();
    },
    async setPlayer() {
      if (this.username) {
        return true;
      }
      const username = await this.$swal({
        title: "What username do you want?",
        content: {
          element: "input",
          attributes: {
            placeholder: "Enter your username",
            type: "text",
          },
        },
      });
      if (username) {
        this.$store.dispatch("createConnection", {
          username: username,
          channelProvider: window.channelProvider,
          host: this.host,
        });
        this.connection.on("state", () => this.setState(true));
        this.connection.on("data", () => this.setState(true));
        this.connection.on("newPlayer", () => this.setState(true));
        this.connection.on("playerUpdate", (oldPosition) =>
          this.updatePlayerAvatar(oldPosition)
        );
        return true;
      }
      return false;
    },
    async createRoom() {
      this.host = true;
      if (await this.setPlayer()) {
        const code = this.connection.id;
        await this.$swal({
          title: "Room Created!",
          content: this.$strToHtml(
            `<div class="flex flex-col text-center"><div class="text-2xl">Use this code to invite others:</div><div id="roomCode" class="text-lg font-bold uppercase tracking-wide mt-2 p-4 bg-gray-200 rounded" onclick="window.getSelection().selectAllChildren(document.getElementById('roomCode'));">${code}</div></div>`
          ),
          icon: "success",
          className: "normal-case",
        });
      }
    },
    async joinRoom() {
      this.host = false;
      if (await this.setPlayer()) {
        const code = await this.$swal({
          title: "What room do you want to join?",
          content: {
            element: "input",
            attributes: {
              placeholder: "Enter the room code",
              type: "text",
            },
          },
        });
        if (code) {
          this.connection.joinRoom(code.toLowerCase());
          await this.$swal({
            title: "Room Joined!",
            content: this.$strToHtml(
              `<div class="flex flex-col text-center"><div class="text-2xl">Use this code to invite others:</div><div id="roomCode" class="text-lg font-bold uppercase tracking-wide mt-2 p-4 bg-gray-200 rounded" onclick="window.getSelection().selectAllChildren(document.getElementById('roomCode'));">${code}</div></div>`
            ),
            icon: "success",
            className: "normal-case",
          });
        }
      }
    },
    async startGame() {
      await this.connection.createChannel();
    },
    addLight(...pos) {
      const color = 0xffffff;
      const intensity = 0.85;
      const light = new THREE.DirectionalLight(color, intensity);
      light.castShadow = true;
      light.position.set(...pos);
      this.three.scenes.webgl.add(light);
      // this.three.scenes.webgl.add(light.target);
      // const helper = new THREE.DirectionalLightHelper(light, 5);
      // this.three.scenes.webgl.add(helper);
    },
    updatePhysics() {
      this.world.step(1 / 60.0);

      for (var i in this.dice) {
        this.dice[i].updateMeshFromBody();
      }
    },
    animate(now) {
      this.three.globals.time = now * 0.001;
      this.three.globals.deltaTime = Math.min(
        this.three.globals.time - this.three.then,
        1 / 20
      );
      this.three.then = this.three.globals.time;
      this.updatePhysics();

      this.three.gameObjectManager.update();

      this.three.renderers.webgl.render(
        this.three.scenes.webgl,
        this.three.camera
      );
      this.three.renderers.css.render(this.three.scenes.css, this.three.camera);
      TWEEN.update();

      requestAnimationFrame(this.animate);
    },
    onWindowResize() {
      this.three.camera.aspect = window.innerWidth / window.innerHeight;
      this.three.camera.updateProjectionMatrix();
      this.three.renderers.css.setSize(window.innerWidth, window.innerHeight);
      this.three.renderers.webgl.setSize(window.innerWidth, window.innerHeight);
    },
    createAvatar(player) {
      if (!this.pieces.has(player.id)) {
        const animalModelNames = [
          "pig",
          "llama",
          "pug",
          "sheep",
          "zebra",
          "horse",
        ];
        const name = animalModelNames.includes(player.avatar)
          ? player.avatar
          : animalModelNames[player.id.charCodeAt(2) % animalModelNames.length];
        const gameObject = this.three.gameObjectManager.createGameObject(
          this.three.board.outer,
          name,
          this.three.globals
        );
        gameObject.move(this.squareNumToCoordinates(0));
        /*const animalComponent = */ gameObject.addComponent(
          Animal,
          this.models[name],
          this.three.globals
        );
        this.pieces.set(player.id, gameObject);
      }
    },
    prepModelsAndAnimations() {
      const box = new THREE.Box3();
      const size = new THREE.Vector3();

      for (let [key, value] of Object.entries(this.models)) {
        box.setFromObject(value.gltf.scene);
        box.getSize(size);
        this.models[key].size = size.length();
        const animsByName = {};

        this.models[key].gltf.animations.forEach((clip) => {
          animsByName[clip.name] = clip;
          // Should really fix this in .blend file
          if (clip.name === "Walk") {
            clip.duration /= 2;
          }
          if (clip.name === "Death") {
            clip.duration *= 5;
          }
        });
        this.models[key].animations = animsByName;
      }
    },
    getCenterPoint(mesh) {
      let geometry = mesh.geometry;
      geometry.computeBoundingBox();
      let center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      // mesh.localToWorld(center);
      return center;
    },
    squareNumToCoordinates(squareNum) {
      // Find out which side, width = 23, height = 28, total size = 263
      const quadrant = Math.floor(squareNum / 10);
      const offset = squareNum % 10;
      const y = -131.5 + 14; // constant
      const x = 117.5 - 5.5 - offset * 22.5 + (offset == 0 ? 5.5 : 0); // constant
      const origin = this.getCenterPoint(this.three.board.outer);
      const x_1 =
        Math.cos((-quadrant * Math.PI) / 2) * (x - origin.x) -
        Math.sin((-quadrant * Math.PI) / 2) * (y - origin.y) +
        origin.x;
      const y_1 =
        Math.sin((-quadrant * Math.PI) / 2) * (x - origin.x) +
        Math.cos((-quadrant * Math.PI) / 2) * (y - origin.y) +
        origin.y;
      return new THREE.Vector3(x_1, y_1, origin.z);
      // HANDLE JAIL/VISITING
    },
    until(conditionFunction) {
      const poll = (resolve) => {
        if (conditionFunction()) resolve();
        else setTimeout(() => poll(resolve), 400);
      };
      return new Promise(poll);
    },
    async randomDiceThrow(dice) {
      let diceValues = dice.map((value, i) => {
        this.dice[i].getObject().position.x = -1 * (i + 1) * 15;
        this.dice[i].getObject().position.z = 75;
        this.dice[i].getObject().position.y = 1 * (i + 1) * 15;
        this.dice[i].getObject().quaternion.x =
          ((Math.random() * 90 - 45) * Math.PI) / 180;
        this.dice[i].getObject().quaternion.y =
          ((Math.random() * 90 - 45) * Math.PI) / 180;
        this.dice[i]
          .getObject()
          .body.velocity.set(
            60 * Math.random() - 30,
            60 * Math.random() - 30,
            525
          );
        this.dice[i]
          .getObject()
          .body.angularVelocity.set(
            25 * Math.random() + 25,
            25 * Math.random() + 25,
            50 * Math.random()
          );
        this.dice[i].updateBodyFromMesh();
        return {
          dice: this.dice[i],
          value: value,
        };
      });
      DiceManager.prepareValues(diceValues);
      return this.until(() => this.dice.every((dice) => dice.isFinished()));
    },
    async updatePlayerAvatar(oldPosition) {
      console.log("update from vuex detected");
      await this.pieces.get(this.currentPlayer.id).move(this.position);
      let side = Math.floor(this.position / 10);
      this.angle += (Math.PI * side) / 2;
      this.elements[this.position].componentInstance.active = true;
      this.elements[oldPosition].componentInstance.active = false;
      this.elements[this.position].componentInstance.popup();
      // await this.setState();
    },
    async nextState() {
      this.$store.dispatch("nextState");
      await this.setState();
    },
    async setState(received = false) {
      console.log("setting new state");
      if (received && this.$swal.getState().isOpen) this.$swal.close();
      switch (this.state.positionType) {
        case PositionType.Start:
          console.log("in starting position, creating avatar for players");
          this.state.players.forEach((player) => this.createAvatar(player));
          break;
        case PositionType.Rolling:
          this.$store.dispatch("rollDice");
          console.log("rolling dice");
          console.log(this.lastRoll);
          await this.randomDiceThrow(this.lastRoll);
          if (this.isCurrentPlayer) {
            await this.nextState();
          }
          // check doubles
          break;
        case PositionType.Moving: {
          const newPosition = this.position;
          const delta = this.$store.getters.getDiceRoll.reduce(
            (a, b) => a + b,
            0
          );
          let oldPosition = newPosition - delta;
          if (oldPosition < 0) {
            oldPosition += 40;
          }
          const steps = [...Array(delta).keys()]
            .map((i) => i + oldPosition + 1)
            .map((i) => this.squareNumToCoordinates(i));
          await this.pieces.get(this.currentPlayer.id).moveArray(steps);
          if (this.isCurrentPlayer) {
            await this.nextState();
          }
          break;
        }
        case PositionType.Action: {
          const value = this.position;
          let old =
            this.position -
            this.$store.getters.getDiceRoll.reduce((a, b) => a + b, 0);
          if (old < 0) {
            old += 40;
          }
          let side = Math.floor(value / 10);
          this.angle = (Math.PI * side) / 2;
          this.elements[value].componentInstance.active = true;
          this.elements[old].componentInstance.active = false;
          this.elements[value].componentInstance.popup();
          break;
        }
        case PositionType.Maintenance:
          if (this.isCurrentPlayer) {
            await this.nextState();
          }
          break;
        case PositionType.NextPlayer:
          if (this.isCurrentPlayer && !received) {
            this.$store.dispatch("nextPlayer");
            this.connection.updateChannel(this.$store.getters.getState);
          }
          this.angle = (Math.PI * Math.floor(this.position / 10)) / 2;
          // await this.nextState();
          break;
        case PositionType.Bankrupt:
          // await this.nextState();
          break;
        case PositionType.End:
          this.connection.closeChannel();
          break;
      }
      console.log("setstate finished");
    },
  },
  beforeDestroy: function () {
    window.removeEventListener("resize", this.onWindowResize);
  },
  mounted() {
    window.channelProvider
      .mountWalletComponent("https://xstate-wallet-v-0-3-0.statechannels.org/")
      .then(() => {
        window.channelProvider.enable().then(() => {
          this.ready = true;
        });
      });

    this.three.renderers.css = new CSS3DRenderer();
    this.three.renderers.css.setSize(window.innerWidth, window.innerHeight);
    this.three.renderers.css.domElement.style.position = "absolute";
    this.three.renderers.css.domElement.style.top = 0;

    this.three.renderers.webgl = new THREE.WebGLRenderer({ alpha: true });
    this.three.renderers.webgl.shadowMap.enabled = true;
    this.three.renderers.webgl.setSize(window.innerWidth, window.innerHeight);
    this.three.renderers.webgl.domElement.style.position = "absolute";
    this.three.renderers.webgl.domElement.style.zIndex = 1;
    this.three.renderers.webgl.domElement.style.top = 0;
    this.three.renderers.webgl.domElement.style.pointerEvents = "none"; // enable pointer events passthru to CSS Renderer

    this.three.scenes.css = new THREE.Scene();
    this.three.scenes.webgl = new THREE.Scene();
    this.three.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    this.three.camera.position.set(0, 1150, 1150);

    let flashlight = new THREE.PointLight(0xffffff, 0.75);
    this.three.camera.add(flashlight);
    this.three.scenes.webgl.add(this.three.camera);

    this.three.controls = new OrbitControls(
      this.three.camera,
      this.three.renderers.css.domElement
    );
    this.three.controls.minPolarAngle = this.three.controls.maxPolarAngle =
      Math.PI * 0.3;
    this.three.controls.enableRotate = true;
    this.three.controls.enablePan = false;
    this.three.controls.zoomSpeed = 0.8;
    this.three.controls.rotateSpeed = 0.4;
    this.three.controls.update();

    this.addLight(0, 750, 0);

    const manager = new THREE.LoadingManager();
    manager.onLoad = this.prepModelsAndAnimations.bind(this);

    {
      const gltfLoader = new GLTFLoader(manager);
      for (const model of Object.values(this.models)) {
        gltfLoader.load(model.url, (gltf) => {
          model.gltf = gltf;
        });
      }
    }

    this.three.gameObjectManager = new GameObjectManager();

    let material = new THREE.ShadowMaterial();
    material.opacity = 0.9;

    let geometry = new THREE.PlaneGeometry();

    this.three.board.outer = new THREE.Mesh(geometry, material);
    this.three.board.outer.rotation.x = -Math.PI / 2;
    this.three.board.outer.scale.multiplyScalar(5.15);
    this.three.board.outer.receiveShadow = true;

    this.three.board.center = new THREE.Mesh(geometry, material);
    this.three.board.outer.scale.multiplyScalar(0.755);
    this.three.board.center.receiveShadow = true;
    this.three.board.outer.add(this.three.board.center);

    this.three.table = new CSS3DObject(this.$refs.table);
    this.three.table.rotation.x = -Math.PI / 2;

    Object.defineProperty(this.three.board.center, "rotation", {
      value: this.three.table.rotation,
    });

    this.three.control = new CSS3DSprite(this.$refs.control);

    this.three.scenes.webgl.add(this.three.board.outer);

    this.three.scenes.css.add(this.three.table);
    this.three.renderers.css.domElement.appendChild(
      this.three.renderers.webgl.domElement
    );

    document
      .getElementById("table")
      .appendChild(this.three.renderers.css.domElement);

    this.world = new CANNON.World();
    this.world.gravity.set(0, 0, -9.8 * 400);
    let floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: DiceManager.floorBodyMaterial,
    });

    this.world.add(floorBody);
    DiceManager.setWorld(this.world);
    this.dice.push(new DiceD6({ size: 15, backColor: "#202020" }));
    this.dice.push(new DiceD6({ size: 15, backColor: "#202020" }));
    this.dice.forEach((dice, idx) => {
      dice.getObject().castShadow = true;
      this.three.board.center.add(dice.getObject());
      dice.getObject().position.x = idx * 50;
      dice.getObject().position.z = idx * 50;
    });
    window.addEventListener("resize", this.onWindowResize);
    requestAnimationFrame(this.animate);
  },
};
</script>

<style>
.darken {
  filter: brightness(95%);
}
.bg-gradient {
  background-color: #4a5568;
  /* background-image: linear-gradient(to right, #868f96 0%, #596164 100%); */
}
.shadow-xl {
  box-shadow: rgba(22, 31, 39, 0.42) 0px 60px 123px -25px,
    rgba(19, 26, 32, 0.08) 0px 35px 75px -35px;
}
</style>
