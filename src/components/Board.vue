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
        <button class="p-2 select-none text-xl text-white" @click="rollDice">Roll Dice</button>
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
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DiceManager } from "threejs-dice/lib/dice.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// import { SkeletonUtils } from "three/examples/jsm/utils/SkeletonUtils.js";
// import {
//     PointerLockControls
// } from 'three/examples/jsm/controls/PointerLockControls';
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
      three: { scenes: {}, renderers: {}, board: {}, pieces: [] },
      cannon: { dice: [] },
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
    avatar() {
      const random = Math.floor(Math.random() * 2);
      const type = this.avatars[Object.keys(this.avatars)[random]];
      return this.$icon(
        {
          prefix: Object.keys(this.avatars)[random],
          iconName: type[Math.floor(Math.random() * type.length)]
        },
        {
          transform: {
            size: 128
          }
        }
      );
    },
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
      this.three.camera.rotation.y = this.three.camera.rotation.y + Math.PI / 2;
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
    animate() {
      this.cannon.world.step(1.0 / 60.0);
      this.cannon.dice.forEach(dice => dice.updateMeshFromBody());
      requestAnimationFrame(this.animate);
      this.three.controls.update();
      this.three.renderers.webgl.render(
        this.three.scenes.webgl,
        this.three.camera
      );
      this.three.renderers.css.render(this.three.scenes.css, this.three.camera);
      let time = performance.now() * 0.0001;
      let idx = time % 4;
      let idx2 = (time + 1) % 4 | 0;
      let frac = idx - (idx | 0);
      idx |= 0;
      this.tmp.copy(this.cornerPoints[idx2]).multiplyScalar(frac);

      this.three.pieces.forEach(piece => {
        piece.position
          .copy(this.cornerPoints[idx])
          .multiplyScalar(1 - frac)
          .add(this.tmp);
      });
      // this.three.controls.target.copy(this.three.pieces[0].position);

      // let cdist = this.three.pieces[0].localToWorld(this.tmp.copy(this.three.pieces[0].position)).sub(this.three.camera.position).length()
      // this.three.pieces[0].localToWorld(this.tmp.copy(this.three.pieces[0].position))
      // this.three.pieces[0].localToWorld(this.three.camera.position.copy(this.three.pieces[0].position)).normalize().multiplyScalar(cdist).add(this.tmp)
    },
    onWindowResize() {
      this.three.camera.aspect = window.innerWidth / window.innerHeight;
      this.three.camera.updateProjectionMatrix();
      this.three.renderers.css.setSize(window.innerWidth, window.innerHeight);
      this.three.renderers.webgl.setSize(window.innerWidth, window.innerHeight);
    },
    randomDiceThrow() {
      let diceValues = [];

      for (let i = 0; i < this.cannon.dice.length; i++) {
        let yRand = Math.random() * 20;
        this.cannon.dice[i].getObject().position.x = -15 - (i % 3) * 1.5;
        this.cannon.dice[i].getObject().position.y =
          2 + Math.floor(i / 3) * 1.5;
        this.cannon.dice[i].getObject().position.z = -15 + (i % 3) * 1.5;
        this.cannon.dice[i].getObject().quaternion.x =
          ((Math.random() * 90 - 45) * Math.PI) / 180;
        this.cannon.dice[i].getObject().quaternion.z =
          ((Math.random() * 90 - 45) * Math.PI) / 180;
        this.cannon.dice[i].updateBodyFromMesh();
        let rand = Math.random() * 5;
        this.cannon.dice[i]
          .getObject()
          .body.velocity.set(25 + rand, 40 + yRand, 15 + rand);
        this.cannon.dice[i]
          .getObject()
          .body.angularVelocity.set(
            20 * Math.random() - 10,
            20 * Math.random() - 10,
            20 * Math.random() - 10
          );

        diceValues.push({ dice: this.cannon.dice[i], value: i + 1 });
      }

      DiceManager.prepareValues(diceValues);
    }
  },
  beforeDestroy: function() {
    window.removeEventListener("resize", this.onWindowResize);
  },
  mounted() {
    this.three.scenes.css = new THREE.Scene();
    this.three.scenes.webgl = new THREE.Scene();
    this.three.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.three.camera.position.set(0, 3.5, 0);

    let light = new THREE.PointLight(0xffffff, 0.6, 100);
    light.position.set(1.5, 3.0, 1.5);
    this.three.scenes.webgl.add(light);
    light.shadow.radius = 2.5;
    light.castShadow = true;

    light = new THREE.PointLight(0xffffff, 0.6, 100);
    light.position.set(-1.0, 3.0, -1.0);
    light.castShadow = true;
    light.shadow.radius = 2.5;
    this.three.scenes.webgl.add(light);

    let material = new THREE.MeshBasicMaterial();
    material.color.set("black");
    material.opacity = 0;
    material.side = THREE.DoubleSide;
    material.blending = THREE.NoBlending;

    let geometry = new THREE.PlaneGeometry();
    // let planeMesh = new THREE.Mesh(geometry, material);

    this.three.board.outer = new THREE.Mesh(geometry, material);
    this.three.board.outer.rotation.x = -Math.PI / 2;
    this.three.board.outer.scale.multiplyScalar(5.15);
    this.three.board.outer.receiveShadow = true;

    this.three.board.center = new THREE.Mesh(geometry, material);
    this.three.board.outer.scale.multiplyScalar(0.755);
    this.three.board.center.receiveShadow = true;

    this.three.board.outer.add(this.three.board.center);

    this.three.table = new CSS3DObject(this.$refs.table);
    this.three.table.scale.multiplyScalar(0.005);
    this.three.table.position.y -= 8;
    // this.three.table.position.z = -850;
    this.three.table.rotation.x = -Math.PI / 2;

    // Object.defineProperty(this.three.board.center, "position", {
    //   value: this.three.table.position
    // });
    Object.defineProperty(this.three.board.center, "rotation", {
      value: this.three.table.rotation
    });

    // this.three.sprite = new CSS3DSprite(this.avatar.node[0]);
    // this.three.sprite.position.z = -600;
    // this.three.sprite.position.x = 100;
    // this.three.sprite.position.y = 0;

    this.three.control = new CSS3DSprite(this.$refs.control);
    // this.three.control.position.z = -800;
    // this.three.control.position.x = window.innerWidth / 3 + 200;
    // this.three.control.position.y = 0;

    // this.three.scenes.webgl.add(planeMesh);
    // this.three.control.position.x = 500;
    // this.three.control.position.y = 0;
    // this.three.control.position.z = -600;
    // this.three.control.rotation.y = 2 * Math.PI;

    // this.light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);

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
    this.three.renderers.webgl.domElement.style.pointerEvents = "none";

    this.three.renderers.css.domElement.appendChild(
      this.three.renderers.webgl.domElement
    );

    document
      .getElementById("table")
      .appendChild(this.three.renderers.css.domElement);

    // this.three.scenes.css.add(this.three.camera);
    this.three.scenes.webgl.add(this.three.board.outer);

    // this.three.scenes.css.add(this.three.controls.getObject());
    this.three.scenes.css.add(this.three.table);
    // this.three.scenes.css.add(this.three.sprite);
    // this.three.scenes.css.add(this.three.control);
    // this.three.scenes.webgl.add(new THREE.AxesHelper(5));

    this.three.camera.position.z = 7.5;

    // this.three.controls = new THREE.PointerLockControls(this.camera);
    this.three.controls = new OrbitControls(
      this.three.camera,
      this.three.renderers.css.domElement
    );
    // this.three.controls.rotateSpeed = 0.8;
    this.three.controls.minPolarAngle = this.three.controls.maxPolarAngle =
      Math.PI * 0.3;
    this.three.controls.enableRotate = true;
    this.three.controls.enablePan = false;
    this.three.controls.zoomSpeed = 0.8;
    this.three.controls.rotateSpeed = 0.4;
    // this.three.controls.panSpeed = 0.8;

    this.cannon.world = new CANNON.World();

    DiceManager.setWorld(this.cannon.world);

    // this.cannon.dice.push(new DiceD6({ backColor: "blue" }));
    // this.cannon.dice.push(new DiceD6({ backColor: "red" }));
    this.cannon.dice.forEach(dice =>
      this.three.board.center.add(dice.getObject())
    );

    // setInterval(this.randomDiceThrow, 3000);

    // this.randomDiceThrow();

    // new GLTFLoader().load(
    //   "https://cdn.glitch.com/346084eb-24bd-47ca-adb3-c3c4c4c9e56f%2Fmonopieces.glb?v=1583135864894",
    //   gltf => {
    //     let model = gltf.scene;
    //     model.scale.multiplyScalar(0.006);

    //     model.traverse(e => {
    //       if (e.isMesh) e.castShadow = e.receiveShadow = true;
    //     });

    //     this.three.pieces.push(model.getObjectByName("node-0002").clone());
    //     this.three.pieces[0].rotation.x = Math.PI / 2;
    //     this.three.pieces[0].rotation.y = Math.PI / 2;
    //     this.three.pieces[0].position.x -= 5;
    //     this.three.pieces[0].position.x += 0.58;
    //     this.three.pieces[0].position.y -= 0.58;
    //     this.three.pieces[0].scale.multiplyScalar(0.01);

    //     this.three.board.outer.add(this.three.pieces[0]);
    //   }
    // );
    const gltfLoader = new GLTFLoader();
    for (const model of Object.values(this.models)) {
      gltfLoader.load(model.url, gltf => {
        model.gltf = gltf;
      });
    }

    this.animate();
    window.addEventListener("resize", this.onWindowResize);
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
/* .preserve-3d {
  transform-style: preserve-3d;
} */
.threed {
  transform: perspective(130em) rotateX(35deg) translateY(-10em);
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
}
.threed .anti-3d {
  /* transform: perspective(0) rotateX(-35deg) translateZ(1em) translateX(-16em) */
  /* translateY(-1em) rotateY(180deg); */
  transform: translateX(1em) translateY(2.5em) translateZ(1em)
    perspective(130em) rotateX(-35deg) rotateY(180deg);
  filter: drop-shadow(-6px -6px 2px rgba(0, 0, 0, 0.7));
  /* box-shadow: 0 10px 6px -6px rgba(0, 0, 0, 0.55); */
}
</style>
