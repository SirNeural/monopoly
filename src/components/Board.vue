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
        <div class="board bg-black border-2 border-black">
          <slot></slot>
        </div>
      </div>
    </div>

    <div class="flex flex-col flex-wrap min-h-screen justify-around m-8 pb-12" ref="control">
      <div class="flex flex-col items-end">
        <div
          class="flex flex-row normal-case select-none py-2"
          v-for="p in sortedPlayers"
          :key="p.username"
        >
          <span class="text-white text-lg">{{ p.username }}:</span>
          <span class="ml-1 text-white text-xl">${{ p.balance }}</span>
        </div>
      </div>
      <div class="text-lg text-white normal-case">
        <div v-if="lastRoll">
          Last Roll:
          {{ lastRoll ? Object.entries(lastRoll)[0][1].join(", ") : "" }}
        </div>
      </div>
      <div class="flex flex-col">
        <button class="p-2 select-none text-xl text-white" @click="joinRoom">Join Room</button>
        <button class="p-2 select-none text-xl text-white" @click="createRoom">Create Room</button>
        <button class="p-2 select-none text-xl text-white" @click="randomDiceThrow">Roll Dice</button>
        <button class="p-2 select-none text-xl text-white" @click="rotate">Rotate</button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import niceware from "niceware";
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
  CSS3DRenderer
} from "three/examples/jsm/renderers/CSS3DRenderer.js";
export default {
  data() {
    return {
      angle: 0,
      username: "",
      room: "",
      cornerrad: 0.58,
      tmp: new THREE.Vector3(),
      world: {},
      dice: [],
      three: {
        scenes: {},
        renderers: {},
        board: {},
        pieces: [],
        mixers: [],
        globals: {
          debug: false,
          time: 0,
          moveSpeed: 16,
          deltaTime: 0,
          player: null,
          kForward: new THREE.Vector3(0, 0, 1)
        },
        then: 0
      },
      models: {
        pig: {
          url:
            "https://threejsfundamentals.org/threejs/resources/models/animals/Pig.gltf"
        },
        cow: {
          url:
            "https://threejsfundamentals.org/threejs/resources/models/animals/Cow.gltf"
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
      }
    };
  },
  props: ["elements"],
  computed: {
    ...mapGetters({
      player: "getCurrentPlayer",
      position: "getCurrentPlayerPosition",
      players: "getPlayers",
      avatars: "getAvatars",
      peer: "getPeer",
      sortedPlayers: "getSortedPlayers",
      lastRoll: "getLastRoll"
    }),
    cornerPoints() {
      return [
        new THREE.Vector3(this.cornerrad, -this.cornerrad, 0),
        new THREE.Vector3(-this.cornerrad, -this.cornerrad, 0),
        new THREE.Vector3(-this.cornerrad, this.cornerrad, 0),
        new THREE.Vector3(this.cornerrad, this.cornerrad, 0)
      ];
    }
  },
  watch: {
    position(value, old) {
      let delta = Math.floor(value / 10) - Math.floor(old / 10);
      if (delta < 0) {
        delta += 4;
      }
      this.angle -= (Math.PI * delta) / 2;
      this.elements[value].componentInstance.active = true;
      this.elements[old].componentInstance.active = false;
      this.elements[value].componentInstance.popup();
    }
  },
  methods: {
    rotate() {
      // console.log("rotating");
      this.three.camera.rotateY(90 * THREE.Math.DEG2RAD);
    },
    rollDice() {
      this.$store.dispatch("rollDice", this.username);
    },
    async setPlayer() {
      const username = await this.$swal({
        title: "What username do you want?",
        content: {
          element: "input",
          attributes: {
            placeholder: "Enter your username",
            type: "text"
          }
        }
      });
      if (username) {
        this.username = username;
        const user = await this.$db.collection("players").add({
          username: this.username,
          created_at: this.$timestamp()
        });
        this.$store.dispatch("setPlayer", {
          username: this.username,
          userID: user.id
        });
        // console.log(user.id);
        this.$store.dispatch("setPeer", user.id);
        this.openPeer();
        return true;
      }
      return false;
    },
    async createRoom() {
      if (await this.setPlayer()) {
        const code = niceware.generatePassphrase(8).join(" ");
        const room = await this.$db.collection("rooms").add({
          code: code,
          active: true,
          created_at: this.$timestamp()
        });
        await this.roomJoined(room.id);
        await this.$swal({
          title: "Room Created!",
          content: this.$strToHtml(
            `<div class="flex flex-col text-center"><div class="text-2xl">Use this code to invite others:</div><div class="text-lg font-bold uppercase tracking-wide mt-2 p-4 bg-gray-200 rounded">${code}</div></div>`
          ),
          icon: "success",
          className: "normal-case"
        });
      }
    },
    async joinRoom() {
      if (await this.setPlayer()) {
        const code = await this.$swal({
          title: "What room do you want to join?",
          content: {
            element: "input",
            attributes: {
              placeholder: "Enter the room code",
              type: "text"
            }
          }
        });
        if (code) {
          const query = await this.$db
            .collection("rooms")
            .where("code", "==", code.trim().toLowerCase())
            .where("active", "==", true)
            .orderBy("created_at", "desc")
            .limit(1)
            .get();
          if (!query.empty) {
            const room = query.docs[0].id;
            await this.roomJoined(room);
            await this.$swal({
              title: "Room Joined!",
              content: this.$strToHtml(
                `<div class="flex flex-col text-center"><div class="text-2xl">Use this code to invite others:</div><div class="text-lg font-bold uppercase tracking-wide mt-2 p-4 bg-gray-200 rounded">${code}</div></div>`
              ),
              icon: "success",
              className: "normal-case"
            });
          }
        }
      }
    },
    async roomJoined(room) {
      this.$store.dispatch("setSeed", room);
      this.$store.dispatch("seedRandom");
      await this.$db
        .collection("players")
        .doc(this.player.id)
        .update({
          room_id: room
        });
      const query = await this.$db
        .collection("players")
        .where("room_id", "==", room);
      const players = await query.get();
      players.docs.forEach(player => {
        if (player.data().username !== this.username) {
          this.$store.dispatch("addExistingPlayer", {
            username: player.data().username,
            userID: player.id
          });
        }
      });
      await query.onSnapshot(snapshot => {
        snapshot.forEach(doc => {
          this.$store.dispatch("addNewPlayer", {
            username: doc.data().username,
            id: doc.id
          });
        });
      });
    },
    addLight(...pos) {
      const color = 0xffffff;
      const intensity = 1;
      const light = new THREE.DirectionalLight(color, intensity);
      light.castShadow = true;
      light.position.set(...pos);
      this.three.scenes.webgl.add(light);
      this.three.scenes.webgl.add(light.target);
    },
    updatePhysics() {
      this.world.step(1.0 / 60.0);

      for (var i in this.dice) {
        this.dice[i].updateMeshFromBody();
      }
    },
    animate(now) {
      this.updatePhysics();
      this.three.globals.time = now * 0.001;
      this.three.globals.deltaTime = Math.min(
        this.three.globals.time - this.three.then,
        1 / 20
      );
      this.three.then = this.three.globals.time;

      this.three.gameObjectManager.update();

      this.three.renderers.webgl.render(
        this.three.scenes.webgl,
        this.three.camera
      );
      this.three.renderers.css.render(this.three.scenes.css, this.three.camera);

      requestAnimationFrame(this.animate);
    },
    onWindowResize() {
      this.three.camera.aspect = window.innerWidth / window.innerHeight;
      this.three.camera.updateProjectionMatrix();
      this.three.renderers.css.setSize(window.innerWidth, window.innerHeight);
      this.three.renderers.webgl.setSize(window.innerWidth, window.innerHeight);
    },
    init() {
      this.prepModelsAndAnimations();

      // const noteGO = this.three.gameObjectManager.createGameObject(
      //   this.three.board.center,
      //   "note"
      // );

      const animalModelNames = [
        "pig",
        "llama",
        "pug",
        "sheep",
        "zebra",
        "horse"
      ];
      const base = new THREE.Object3D();
      const offset = new THREE.Object3D();
      base.add(offset);
      base.rotation.x = Math.PI / 2;

      // position animals in a spiral.
      const numAnimals = 7;
      const arc = 10;
      const b = 10 / (2 * Math.PI);
      let r = 120;
      let phi = r / b;
      for (let i = 0; i < numAnimals; ++i) {
        const name =
          animalModelNames[
            Math.floor(Math.random() * animalModelNames.length) | 0
          ];
        const gameObject = this.three.gameObjectManager.createGameObject(
          this.three.board.outer,
          name,
          this.three.globals
        );
        gameObject.addComponent(Animal, this.models[name], this.three.globals);
        base.rotation.y = phi;
        offset.position.x = r;
        offset.updateWorldMatrix(true, false);
        offset.getWorldPosition(gameObject.transform.position);
        phi += arc / r;
        r = b * phi;
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

        this.models[key].gltf.animations.forEach(clip => {
          animsByName[clip.name] = clip;
          // Should really fix this in .blend file
          if (clip.name === "Walk") {
            clip.duration /= 2;
          }
        });
        this.models[key].animations = animsByName;
      }
    },
    getCenterPoint(mesh) {
      var geometry = mesh.geometry;
      geometry.computeBoundingBox();
      const center = geometry.boundingBox.getCenter();
      // mesh.localToWorld(center);
      return center;
    },
    squareNumToCoordinates(squareNum) {
      // Find out which side
      const quadrant = Math.floor(squareNum / 10);
      const offset = squareNum % 10;
      const y = 0; // constant
      const x = offset * 1; // constant
      const origin = this.getCenterPoint(this.three.board.outer);
      const x_1 =
        Math.cos((quadrant * Math.PI) / 2) * (x - origin.x) -
        Math.sin((quadrant * Math.PI) / 2) * (y - origin.y) +
        origin.x;
      const y_1 =
        Math.sin((quadrant * Math.PI) / 2) * (x - origin.x) +
        Math.cos((quadrant * Math.PI) / 2) * (y - origin.y) +
        origin.y;
      return new THREE.Vector3(x_1, y_1, origin.z);
    },
    randomDiceThrow() {
      let diceValues = [];

      for (let i = 0; i < this.dice.length; i++) {
        let yRand = Math.random() * 20;
        this.dice[i].getObject().position.x = -15 - (i % 3) * 1.5;
        this.dice[i].getObject().position.y = 2 + Math.floor(i / 3) * 1.5;
        this.dice[i].getObject().position.z = -15 + (i % 3) * 1.5;
        this.dice[i].getObject().quaternion.x =
          ((Math.random() * 90 - 45) * Math.PI) / 180;
        this.dice[i].getObject().quaternion.z =
          ((Math.random() * 90 - 45) * Math.PI) / 180;
        this.dice[i].updateBodyFromMesh();
        let rand = Math.random() * 5;
        this.dice[i]
          .getObject()
          .body.velocity.set(25 + rand, 40 + yRand, 15 + rand);
        this.dice[i]
          .getObject()
          .body.angularVelocity.set(
            20 * Math.random() - 10,
            20 * Math.random() - 10,
            20 * Math.random() - 10
          );
        diceValues.push({ dice: this.dice[i], value: 1 });
      }
      console.log(diceValues)
      DiceManager.prepareValues(diceValues);
    }
  },
  beforeDestroy: function() {
    window.removeEventListener("resize", this.onWindowResize);
  },
  mounted() {
    this.three.renderers.css = new CSS3DRenderer();
    this.three.renderers.css.setSize(window.innerWidth, window.innerHeight);
    this.three.renderers.css.domElement.style.position = "absolute";
    this.three.renderers.css.domElement.style.top = 0;

    this.three.renderers.webgl = new THREE.WebGLRenderer({ alpha: true });
    this.three.renderers.webgl.setClearColor(0x00ff00, 0.0);
    this.three.renderers.webgl.setSize(window.innerWidth, window.innerHeight);
    this.three.renderers.webgl.domElement.style.position = "absolute";
    this.three.renderers.webgl.domElement.style.zIndex = 1;
    this.three.renderers.webgl.domElement.style.top = 0;
    this.three.renderers.webgl.domElement.style.pointerEvents = "none"; // make pointer events passthru to CSS Renderer

    this.three.scenes.css = new THREE.Scene();
    this.three.scenes.webgl = new THREE.Scene();
    this.three.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    this.three.camera.position.set(0, 1150, 1150);

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

    this.addLight(5, 5, 2);
    this.addLight(-5, 5, 5);

    const manager = new THREE.LoadingManager();
    manager.onLoad = this.init.bind(this);

    {
      const gltfLoader = new GLTFLoader(manager);
      for (const model of Object.values(this.models)) {
        gltfLoader.load(model.url, gltf => {
          model.gltf = gltf;
        });
      }
    }

    this.three.gameObjectManager = new GameObjectManager();

    let material = new THREE.MeshBasicMaterial();
    material.color.set("black");
    material.opacity = 0;
    material.side = THREE.DoubleSide;
    material.blending = THREE.NoBlending;

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
    // this.three.table.scale.multiplyScalar(0.5);
    // this.three.table.position.y -= 8;
    this.three.table.rotation.x = -Math.PI / 2;

    Object.defineProperty(this.three.board.center, "rotation", {
      value: this.three.table.rotation
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
    this.world.gravity.set(0, 0, -9.8 * 100);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 16;
    let floorBody = new CANNON.Body({mass: 0, shape: new CANNON.Plane(), material: DiceManager.floorBodyMaterial});
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), -Math.PI / 2);
    this.world.add(floorBody);
    DiceManager.setWorld(this.world);
    this.dice.push(new DiceD6({ size: 15, backColor: "#3182CE" }));
    this.dice.push(new DiceD6({ size: 15, backColor: "#DD6B20" }));
    this.dice.forEach(dice => {
      this.three.board.center.add(dice.getObject());
    });
    // setInterval(this.randomDiceThrow, 3000);
    window.addEventListener("resize", this.onWindowResize);
    requestAnimationFrame(this.animate);
  }
};
</script>

<style>
.bg-gradient {
  /* background-color: #f0f0f0; */
  background-image: linear-gradient(to right, #868f96 0%, #596164 100%);
}
.shadow-xl {
  box-shadow: rgba(22, 31, 39, 0.42) 0px 60px 123px -25px,
    rgba(19, 26, 32, 0.08) 0px 35px 75px -35px;
}
</style>
