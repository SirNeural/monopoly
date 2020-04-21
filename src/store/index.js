import Vue from "vue";
import Vuex from "vuex";
import orderBy from "lodash.orderby";
import groupBy from "lodash.groupby";
import pickBy from "lodash.pickby";
import Peer from "peerjs";

import {
  sfc32,
  xmur3
} from "./random";
import {
  avatars
} from "./avatars.json";
import {
  properties,
  spaces
} from "./properties.json";

Vue.use(Vuex);

const state = {
  avatars: avatars,
  seed: [],
  peer: null,
  random: Math.random,
  currentPlayer: "",
  players: {},
  rolls: [],
  tax: 0,
  houses: 32,
  hotel: 12,
  interest: 0.1,
  spaces: spaces,
  properties: properties
};

const credit = (player, amount) => {
  // console.log(player);
  // console.log(player.balance);
  // console.log(amount);
  Vue.set(player, "balance", player.balance + amount);
};
const debit = (player, amount) => {
  if (player.balance >= amount) {
    Vue.set(player, "balance", player.balance - amount);
    return true;
  } else {
    return false;
  }
};

const mutations = {
  SET_SEED: (state, seed) => {
    state.seed = xmur3(seed);
  },
  SEED_RANDOM: state => {
    state.random = sfc32(...[...Array(4)].map(() => state.seed()));
  },
  CHANGE_PLAYER: (state, username) => {
    state.currentPlayer = username;
  },
  COLLECT_TAX: (state, amount) => {
    state.tax += amount;
  },
  CLAIM_TAX: (state, username) => {
    const player = state.players[username] || {};
    credit(player, state.tax);
    state.tax = 0;
  },
  CREDIT: (state, {
    username,
    amount
  }) => {
    const player = state.players[username] || {};
    credit(player, amount);
  },
  DEBIT: (state, {
    username,
    amount
  }) => {
    const player = state.players[username] || {};
    debit(player, amount);
  },
  DEBIT_ALL_PLAYERS: (state, {
    except,
    amount
  }) => {
    for (const player in state.players) {
      if (player !== except) {
        debit(state.players[player], amount);
      }
    }
  },
  NEW_PLAYER: (state, {
    username,
    userID
  }) => {
    if (!Object.prototype.hasOwnProperty.call(state.players, username)) {
      Vue.set(state.players, username, {
        id: userID,
        username: username,
        position: 0,
        balance: 1500,
        bankrupt: false,
        jailPass: 0,
        jailed: 0
      });
    }
  },
  CONNECT_TO_PLAYER: (state, {
    username,
    userID
  }) => {
    var conn = state.peer.connect(
      userID, {
        metadata: {
          from: state.currentPlayer,
          to: username
        }
      }
    );
    // on open will be launch when you successfully connect to PeerServer
    conn.on("open", () => {
      console.log("Successfully connected to " + username);
      Vue.set(state.players[username], "conn", conn);
    });
  },
  ADD_CONNECTION: (state, {
    username,
    conn
  }) => {
    if (Object.prototype.hasOwnProperty.call(state.players, username)) {
      Vue.set(state.players[username], "conn", conn);
    }
  },
  BUY_PROPERTY: (state, {
    propertyName,
    username
  }) => {
    const player = state.players[username] || {};
    const property = state.properties[propertyName] || {};
    // console.log(property);
    if (
      !Object.prototype.hasOwnProperty.call(property, "owner") &&
      !player.bankrupt &&
      debit(player, property.price)
    ) {
      Vue.set(property, "owner", player.username);
      // console.log(property);
      // player.properties.push(property);
    }
  },
  MORTGAGE_PROPERTY: (state, {
    propertyName,
    username
  }) => {
    const player = state.players[username] || {};
    const property = state.properties[propertyName] || {};
    if (
      Object.prototype.hasOwnProperty.call(property, "owner") &&
      property.owner === player.username &&
      !Object.prototype.hasOwnProperty.call(property, "mortgaged") &&
      !property.mortgaged
    ) {
      Vue.set(property, "mortgaged", true);
      credit(player, property.mortgage);
    }
  },
  UNMORTGAGE_PROPERTY: (state, {
    propertyName,
    username
  }) => {
    const player = state.players[username] || {};
    const property = state.properties[propertyName] || {};
    if (
      Object.prototype.hasOwnProperty.call(property, "owner") &&
      property.owner === player.username &&
      Object.prototype.hasOwnProperty.call(property, "mortgaged") &&
      property.mortgaged
    ) {
      debit(player, property.mortgage);
      Vue.delete(property, "mortgaged");
    }
  },
  SELL_PROPERTY: (state, {
    propertyName,
    username
  }) => {
    const player = state.players[username] || {};
    const property = state.properties[propertyName] || {};
    if (
      Object.prototype.hasOwnProperty.call(property, "owner") &&
      property.owner === player.username &&
      !Object.prototype.hasOwnProperty.call(property, "mortgaged") &&
      !property.mortgaged
    ) {
      Vue.delete(property, "owner");
      credit(player, property.price / 2);
    }
  },
  MOVE_PLAYER: (state, {
    username,
    spaces
  }) => {
    const player = state.players[username] || {};
    if ((player.position + spaces) % 40 < player.position && spaces > 0) {
      credit(player, 200);
    }
    Vue.set(player, "position", (player.position + spaces) % 40);
  },
  MOVE_PLAYER_TO_SPACE: (state, {
    username,
    spaceName
  }) => {
    const player = state.players[username] || {};
    const space = state.spaces.indexOf(spaceName);
    if (space < player.position) {
      credit(player, 200);
    }
    if (space !== -1) Vue.set(player, "position", space);
  },
  ROLL_DICE: (state, username) => {
    const player = state.players[username] || {};
    const roll = [
      Math.floor(state.random() * 6) + 1,
      Math.floor(state.random() * 6) + 1
    ];
    const spaces = roll.reduce((total, num) => {
      return total + num;
    }, 0);
    if ((player.position + spaces) % 40 < player.position && spaces > 0) {
      credit(player, 200);
    }
    Vue.set(player, "position", player.position + spaces);
    // player.rolls.push(roll);
    state.rolls.push({
      [player.username]: roll
    });
  },
  JAIL_PLAYER: (state, username) => {
    const player = state.players[username] || {};
    Vue.set(player, "position", 10);
    Vue.set(player, "jailed", 3);
  },
  ADD_JAIL_PASS: (state, username) => {
    const player = state.players[username] || {};
    Vue.set(player, "jailPass", player.jailPass + 1);
  },
  SET_PEER: (state, room) => {
    state.peer = new Peer(room);
    state.peer.on("connection", conn => {
      if (
        Object.prototype.hasOwnProperty.call(state.players, conn.metadata.from) &&
        state.currentPlayer === conn.metadata.to &&
        state.players[conn.metadata.from].id === conn.peer &&
        !Object.prototype.hasOwnProperty.call(state.players[conn.metadata.from], conn)
      ) {
        console.log("Received connection from " + conn.metadata.from);
        Vue.set(state.players[conn.metadata.from], "conn", conn);
      } else {
        conn.close();
      }
      conn.on("data", data => {
        const json = JSON.parse(data);
        console.log(data);
        switch (json.type || "") {
          default:
        }
      });
    });
  },
  BROADCAST_MESSAGE: (state, {
    action,
    payload
  }) => {
    state.players.forEach(player => {
      player.conn.send(action, payload);
    });
  }
};

const actions = {
  setSeed: (context, seed) => {
    context.commit("SET_SEED", seed);
  },
  seedRandom: (context) => {
    context.commit("SEED_RANDOM");
  },
  changePlayer: (context, username) => {
    context.commit("CHANGE_PLAYER", username);
  },
  collectTax: (context, number) => {
    context.commit("COLLECT_TAX", number);
  },
  claimTax: (context, username) => {
    context.commit("CLAIM_TAX", username);
  },
  credit: (context, {
    username,
    amount
  }) => {
    // console.log(amount);
    context.commit("CREDIT", {
      username: username,
      amount: amount
    });
  },
  debit: (context, {
    username,
    amount
  }) => {
    context.commit("DEBIT", {
      username: username,
      amount: amount
    });
  },
  debitAllPlayers: (context, {
    except,
    amount
  }) => {
    context.commit("DEBIT_ALL_PLAYERS", {
      except: except,
      amount: amount
    });
  },
  setPlayer: (context, {
    username,
    userID
  }) => {
    context.commit("NEW_PLAYER", {
      username: username,
      userID: userID
    });
    context.commit("CHANGE_PLAYER", username);
  },
  addConnection: (context, {
    username,
    conn
  }) => {
    context.commit("ADD_CONNECTION", {
      username: username,
      conn: conn
    });
  },
  addExistingPlayer: (context, {
    username,
    userID
  }) => {
    context.commit("NEW_PLAYER", {
      username: username,
      userID: userID
    });
    context.commit("CONNECT_TO_PLAYER", {
      username: username,
      userID: userID
    });
  },
  addNewPlayer: (context, {
    username,
    userID
  }) => {
    context.commit("NEW_PLAYER", {
      username: username,
      userID: userID
    });
  },
  buyProperty: (context, {
    propertyName,
    username
  }) => {
    context.commit("BUY_PROPERTY", {
      propertyName: propertyName,
      username: username
    });
  },
  mortgageProperty: (context, {
    propertyName,
    username
  }) => {
    context.commit("MORTGAGE_PROPERTY", {
      propertyName: propertyName,
      username: username
    });
  },
  sellProperty: (context, {
    propertyName,
    username
  }) => {
    context.commit("SELL_PROPERTY", {
      propertyName: propertyName,
      username: username
    });
  },
  rollDice: (context, username) => {
    context.commit("ROLL_DICE", username);
  },
  movePlayer: (context, {
    username,
    spaces
  }) => {
    context.commit("MOVE_PLAYER", {
      username: username,
      spaces: spaces
    });
  },
  movePlayerToSpace: (context, {
    username,
    spaceName
  }) => {
    context.commit("MOVE_PLAYER_TO_SPACE", {
      username: username,
      spaceName: spaceName
    });
  },
  jailPlayer: (context, username) => {
    context.commit("JAIL_PLAYER", username);
  },
  addJailPass: (context, username) => {
    context.commit("ADD_JAIL_PASS", username);
  },
  setPeer: (context, room) => {
    context.commit("SET_PEER", room);
  }
};

const getters = {
  getTax: state => {
    return state.tax; //mapstate
  },
  getSpaces: state => {
    return state.spaces || false; // mapstate
  },
  getProperty: state => propertyName => {
    return state.properties[propertyName] || false;
  },
  getPropertiesByColor: state => color => {
    return (
      state.properties.filter(
        property => {
          return (
            Object.prototype.hasOwnProperty.call(property, "owner") && property.color === this.color
          );
        }, {
          color: color
        }
      ) || false
    );
  },
  getRandomNumber: state => {
    return state.random();
  },
  getMonopolies: state => username => {
    // console.log(groupBy(state.properties, "color"));
    return Object.entries(groupBy(state.properties, "color"))
      .map(value => {
        return {
          [value[0]]: value[1].map(property => property.owner)
        };
      })
      .map(value => {
        return {
          [Object.keys(value)[0]]: Object.values(value)[0].length ===
            Object.values(value)[0].filter(name => name === username).length
        };
      });
  },
  getCurrentPlayerMonopolies: state => {
    // console.log(groupBy(state.properties, "color"));
    return Object.entries(groupBy(state.properties, "color"))
      .map(value => {
        return {
          [value[0]]: value[1].map(property => property.owner)
        };
      })
      .map(value => {
        return {
          [Object.keys(value)[0]]: Object.values(value)[0].length ===
            Object.values(value)[0].filter(name => name === state.currentPlayer)
            .length
        };
      });
  },
  getPropertyOwner: state => property => {
    if (Object.prototype.hasOwnProperty.call(state.properties[property], "owner")) {
      return state.properties[property].owner
    } else {
      return false;
    }
  },
  getPlayer: state => username => {
    return state.players[username] || false;
  },
  getPlayerProperties: state => username => {
    return pickBy(state.properties, ["owner", username]) || false;
  },
  getCurrentPlayer: state => {
    return state.players[state.currentPlayer] || false; // remove
  },
  getSortedPlayers: state => {
    return orderBy(state.players, ["balance", "username"], ["desc", "asc"]);
  },
  getPlayers: state => {
    return state.players || false; // mapState
  },
  getAvatars: state => {
    return state.avatars || false; // mapState
  },
  getPlayerPositions: state => {
    return Object.entries(state.players).map((player, value) => {
      return {
        [player.username]: value.position
      };
    });
  },
  getPeer: state => {
    return state.peer;
  },
  getCurrentPlayerPosition: state => {
    // const space =
    //   state.spaces[
    //     (state.players.hasOwnProperty(state.currentPlayer)
    //       ? state.players[state.currentPlayer].position
    //       : 0) % 40
    //   ];
    return (
      (Object.prototype.hasOwnProperty.call(state.players, state.currentPlayer) ?
        state.players[state.currentPlayer].position :
        0) % 40
    ); // remove
  },
  getPlayerSpace: state => username => {
    const space =
      state.spaces[
        (Object.prototype.hasOwnProperty.call(state.players, username) ?
          state.players[username].position :
          0) % 40
      ];
    return space;
    // switch (space) {
    //   case state.properties.hasOwnProperty(space):
    //     return state.properties[space];
    //   default:
    //     return { [space]: {} };
    // }
  },
  getLastRoll: state => {
    return state.rolls.length > 0 ? state.rolls[state.rolls.length - 1] : false;
  }
};

export default new Vuex.Store({
  state,
  mutations,
  actions,
  getters
});