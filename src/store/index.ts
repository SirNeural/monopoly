import Vue from "vue";
import Vuex from "vuex";
import orderBy from "lodash.orderby";
import groupBy from "lodash.groupby";
import { PositionType, PropertyStatus, ActionType, SpaceType } from '../definitions/types';
import { loadSpaces, loadCards, rand } from '../definitions/Monopoly'
import {
  randomChannelId
} from '@statechannels/nitro-protocol';
import {
  bigNumberify
} from 'ethers/utils';
import { AddressZero } from 'ethers/constants';
import { spaces, properties } from './properties.json';
import { chance, communityChest } from './cards.json';
import syncPlugin from './sync';
import { Connection } from '@/definitions/Connection';

Vue.use(Vuex);

const connection = new Connection();
const connectionSync = syncPlugin(connection);

const state = {
  connection: connection,
  state: {
    channelId: randomChannelId(),
    nonce: bigNumberify(0),
    currentPlayer: bigNumberify(0),
    taxes: bigNumberify(0),
    positionType: PositionType.Start,
    houses: 32,
    hotels: 12,
    players: [],
    spaces: loadSpaces(spaces, properties),
    chance: loadCards(chance),
    communityChest: loadCards(communityChest)
  },
  turns: [],
  currentTurn: {
    player: 0,
    purchased: [],
    mortgaged: [],
    unmortgaged: [],
    housesAdded: [],
    housesRemoved: []
  }
};

const credit = (player, amount) => {
  Vue.set(player, "balance", bigNumberify(player.balance).add(amount));
};
const debit = (player, amount, force = false) => {
  if (bigNumberify(player.balance).gte(amount) || force) {
    Vue.set(player, "balance", bigNumberify(player.balance).sub(amount));
    return true;
  } else {
    return false;
  }
};

const mutations = {
  CREATE_CONNECTION: (state, { username, channelProvider, host }) => {
    state.connection.initialize(username, channelProvider, host);
  },
  NEXT_STATE: (state) => {
    switch (state.state.positionType) {
      case PositionType.Start:
        Vue.set(state.state, "positionType", PositionType.Rolling);
        // rolling
        break;
      case PositionType.Rolling:
        if (state.state.players[state.state.currentPlayer.toNumber()].jailed == 0) {
          Vue.set(state.state, "positionType", PositionType.Moving);
        } else {
          Vue.set(state.state, "positionType", PositionType.NextPlayer);
        }
        break;
      case PositionType.Moving:
        Vue.set(state.state, "positionType", PositionType.Action);
        break;
      case PositionType.Action:
        if (rand(state.state.nonce.toNumber(), state.state.players[state.state.currentPlayer.toNumber()].id, state.state.channelId, 0, 6) == rand(state.state.nonce.toNumber(), state.state.players[state.state.currentPlayer.toNumber()].id, state.state.channelId, 1, 6)) {
          console.log('action to rolling #1: ' + rand(state.state.nonce.toNumber(), state.state.players[state.state.currentPlayer].id, state.state.channelId, 0, 6))
          console.log('action to rolling #2: ' + rand(state.state.nonce.toNumber(), state.state.players[state.state.currentPlayer].id, state.state.channelId, 1, 6))
          Vue.set(state.state, "positionType", PositionType.Rolling);
        } else {
          Vue.set(state.state, "positionType", PositionType.Maintenance);
        }
        break;
      case PositionType.Maintenance:
        if (state.state.players[state.state.currentPlayer.toNumber()].balance < 0) {
          //bankrupt
          Vue.set(state.state, "positionType", PositionType.Bankrupt);
        } else {
          Vue.set(state.state, "positionType", PositionType.NextPlayer);
        }
        break;
      case PositionType.NextPlayer:
        Vue.set(state.state, "positionType", PositionType.Rolling);
        break;
      case PositionType.Bankrupt:
        if (state.state.players.filter(player => !player.bankrupt).length <= 1) {
          Vue.set(state.state, "positionType", PositionType.End);
        } else {
          Vue.set(state.state, "positionType", PositionType.NextPlayer);
        }
        break;
      case PositionType.End:
        break;
    }
  },
  NEW_PLAYER: (state, {
    username,
    address
  }) => {
    if (!state.state.players.some(player => player.name == username)) {
      state.state.players.push({ name: username, id: address, bankrupt: false, balance: bigNumberify(1500).toString(), jailed: 0, doublesRolled: 0, position: 0, getOutOfJailFreeCards: 0 });
    }
  },
  BUY_PROPERTY: (state, {
    propertyName,
    address
  }) => {
    const player = state.state.players.find(player => player.id == address) || {};
    const property = state.state.spaces.find(property => property.name == propertyName) || {};
    // console.log(property);
    if (
      property.status == PropertyStatus.Unowned &&
      !player.bankrupt &&
      debit(player, property.prices[0])
    ) {
      Vue.set(property, "owner", player.id);
      Vue.set(property, "status", PropertyStatus.Owned);
      state.currentTurn.purchased.push(property.id);
    }
  },
  RENT_PROPERTY: (state, {
    propertyName,
    address
  }) => {
    const player = state.state.players.find(player => player.id == address) || {};
    const property = state.state.spaces.find(property => property.name == propertyName) || {};
    const propertyOwner = state.state.players.find(player => player.id == property.owner);

    if (
      property.status != PropertyStatus.Unowned &&
      property.status != PropertyStatus.Mortgaged &&
      property.owner != player.id
    ) {
      debit(player, property.prices[property.status], true)
      credit(propertyOwner, property.prices[property.status]);
    }
  },
  RENT_RAILROAD: (state, {
    propertyName,
    address
  }) => {
    const player = state.state.players.find(player => player.id == address) || {};
    const property = state.state.spaces.find(property => property.name == propertyName) || {};
    const propertyOwner = state.state.players.find(player => player.id == property.owner);
    const utilities = state.state.spaces.find(property => property.spaceType == SpaceType.Railroad);
    const railroadsOwned = utilities.filter(utility => utility.owner == property.owner).length;

    if (
      property.status != PropertyStatus.Unowned &&
      property.status != PropertyStatus.Mortgaged &&
      property.owner != player.id &&
      railroadsOwned > 0
    ) {
      debit(player, property.prices[25 * (Math.pow(2, railroadsOwned) - 1)], true)
      credit(propertyOwner, property.prices[25 * (Math.pow(2, railroadsOwned) - 1)]);
    }
  },
  RENT_UTILITY: (state, {
    propertyName,
    address
  }) => {
    const player = state.state.players.find(player => player.id == address) || {};
    const property = state.state.spaces.find(property => property.name == propertyName) || {};
    const utilities = state.state.spaces.find(property => property.spaceType == SpaceType.Utility);
    const propertyOwner = state.state.players.find(player => player.id == property.owner);
    const utilitiesOwned = utilities.filter(utility => utility.owner == property.owner).length;
    const diceRoll = [0, 1].map(i => rand(state.state.nonce.toNumber(), state.state.players[state.state.currentPlayer.toNumber()].id, state.state.channelId, i, 6) + 1).reduce((a, b) => a + b, 0);

    if (
      property.status != PropertyStatus.Unowned &&
      property.status != PropertyStatus.Mortgaged &&
      property.owner != player.id &&
      utilitiesOwned > 0
    ) {
      let multiplier;
      if (utilitiesOwned > 1) {
        multiplier = 10;
      } else {
        multiplier = 4;
      }
      debit(player, multiplier * diceRoll, true)
      credit(propertyOwner, multiplier * diceRoll);
    }
  },
  MORTGAGE_PROPERTY: (state, {
    propertyName,
    address
  }) => {
    const player = state.state.players.find(player => player.id == address) || {};
    const property = state.state.spaces.find(property => property.name == propertyName) || {};
    if (property.owner === player.id &&
      (property.status == PropertyStatus.Monopoly || property.status == PropertyStatus.Owned)
    ) {
      credit(player, property.mortgage);
      Vue.set(property, "status", PropertyStatus.Mortgaged);
      state.currentTurn.mortgaged.push(property.id);
    }
  },
  UNMORTGAGE_PROPERTY: (state, {
    propertyName,
    address
  }) => {
    const player = state.state.players.find(player => player.id == address) || {};
    const property = state.state.spaces.find(property => property.name == propertyName) || {};
    if (property.owner === player.id &&
      property.status == PropertyStatus.Mortgaged &&
      debit(player, property.mortgage * 1.1)
    ) {
      Vue.set(property, "status", PropertyStatus.Owned);
      state.currentTurn.unmortgaged.push(property.id);
    }
  },
  DRAW_CARD: (state, {address, type}) => {
    const player = state.state.players.find(player => player.id == address) || {};
    const card = state.state[type][rand(state.state.nonce.toNumber(), player.id, state.state.channelId, 2, state.state[type].length)];
    switch (card.action) {
      case ActionType.PayMoney:
        debit(player, card.amount);
        break;
      case ActionType.CollectMoney:
        credit(player, card.amount);
        break;
      case ActionType.PayMoneyToAll:
        debit(player, card.amount * (state.state.players.length - 1));
        state.state.players.filter(p => p.id != player.id).forEach(p => credit(p, card.amount));
        break;
      case ActionType.CollectMoneyFromAll:
        state.state.players.filter(p => p.id != player.id).forEach(p => debit(p, card.amount));
        credit(player, card.amount * (state.state.players.length - 1));
        break;
      case ActionType.GoToJail:
        Vue.set(player, "position", 10);
        Vue.set(player, "jailed", 1);
        break;
      case ActionType.GetOutOfJailFree:
        Vue.set(player, "getOutOfJailFreeCards", player.getOutOfJailFreeCards + 1);
        break;
      case ActionType.MoveSpaces:
        Vue.set(player, "position", player.position + card.amount.toNumber());
        if (state.state.spaces[player.position + card.amount].status == PropertyStatus.Unowned) {
          // buy property
        }
        break;
      case ActionType.MoveBackSpaces:
        Vue.set(player, "position", player.position - card.amount.toNumber());
        if (state.state.spaces[player.position + card.amount].status == PropertyStatus.Unowned) {
          // buy property
        }
        break;
      case ActionType.MoveToSpace:
        Vue.set(player, "position", card.amount);
        if (state.state.spaces[card.amount].status == PropertyStatus.Unowned) {
          // buy property
        }
        break;
      case ActionType.MoveToNearestUtility:
        if (player.position > 28) {
          Vue.set(player, "balance", 200);
          Vue.set(player, "position", 12);
        } else if (player.position > 12) {
          Vue.set(player, "position", 28);
        } else if (player.position < 12) {
          Vue.set(player, "position", 12);
        }
        break;
      case ActionType.MoveToNearestRailroad:
        if (
          player.position > 35 ||
          player.position < 5
        ) {
          Vue.set(player, "position", 5);
        } else if (player.position > 25) {
          Vue.set(player, "position", 35);
        } else if (player.position > 15) {
          Vue.set(player, "position", 25);
        } else if (player.position > 5) {
          Vue.set(player, "position", 15);
        }
        break;
      case ActionType.PropertyAssessment:
        break;
      case ActionType.GeneralRepairs:
        break;
    }
  },
  ROLL_DICE: (state, address) => {
    const player = state.state.players.find(player => player.id == address) || {};
    const roll = [
      rand(state.state.nonce.toNumber(), player.id, state.state.channelId, 0, 6) + 1,
      rand(state.state.nonce.toNumber(), player.id, state.state.channelId, 1, 6) + 1
    ];
    const spaces = roll.reduce((total, num) => {
      return total + num;
    }, 0);
    if ((player.position + spaces) % 40 < player.position && spaces > 0) {
      credit(player, 200);
    }
    Vue.set(player, "position", player.position + spaces);
  },
  NEXT_NONCE: (state) => {
    Vue.set(state.state, "nonce", state.state.nonce.add(1));
  },
  NEXT_PLAYER: (state) => {
    let nextPlayer = (state.state.currentPlayer.toNumber() + 1) % state.state.players.length;
    while (state.state.players[nextPlayer].bankrupt) {
      nextPlayer++;
    }
    Vue.set(state.state, "currentPlayer", bigNumberify(nextPlayer));
  },
  JAIL_PLAYER: (state) => {
    const player = state.state.players[state.state.currentPlayer.toNumber()];
    Vue.set(player, "position", 10);
    Vue.set(player, "jailed", 1);
  },
  INCOME_TAX: (state) => {
    const player = state.state.players[state.state.currentPlayer.toNumber()];
    debit(player, 200, true)
    state.state.taxes.add(200);
  },
  LUXURY_TAX: (state) => {
    const player = state.state.players[state.state.currentPlayer.toNumber()];
    debit(player, 75, true)
      Vue.set(player, "balance", player.balance.toNumber - 75);
    state.state.taxes.add(75);
  },
  FREE_PARKING: (state) => {
    const player = state.state.players[state.state.currentPlayer.toNumber()];
    const taxes = state.state.taxes;
    state.state.taxes = 0;
    credit(player, taxes);
  }
};

const actions = {
  createConnection: (context, { username, channelProvider, host }) => {
    context.commit("CREATE_CONNECTION", {
      username: username,
      channelProvider: channelProvider,
      host: host
    })
  },
  nextState: (context) => {
    context.commit("NEXT_STATE");
  },
  newPlayer: (context, {
    username,
    address
  }) => {
    context.commit("NEW_PLAYER", {
      username: username,
      address: address
    });
  },
  buyProperty: (context, {
    propertyName,
    address
  }) => {
    context.commit("BUY_PROPERTY", {
      propertyName: propertyName,
      address: address
    });
  },
  rentProperty: (context, {
    propertyName,
    address
  }) => {
    context.commit("RENT_PROPERTY", {
      propertyName: propertyName,
      address: address
    });
  },
  rentRailroad: (context, {
    propertyName,
    address
  }) => {
    context.commit("RENT_RAILROAD", {
      propertyName: propertyName,
      address: address
    });
  },
  rentUtility: (context, {
    propertyName,
    address
  }) => {
    context.commit("RENT_UTILITY", {
      propertyName: propertyName,
      address: address
    });
  },
  mortgageProperty: (context, {
    propertyName,
    address
  }) => {
    context.commit("MORTGAGE_PROPERTY", {
      propertyName: propertyName,
      address: address
    });
  },
  sellProperty: (context, {
    propertyName,
    address
  }) => {
    context.commit("SELL_PROPERTY", {
      propertyName: propertyName,
      address: address
    });
  },
  rollDice: (context, address) => {
    context.commit("NEXT_NONCE");
    context.commit("ROLL_DICE", address);
  },
  drawCard: (context, { address, type }) => {
    context.commit("DRAW_CARD", { address: address, type: type})
  },
  setPeer: (context, room) => {
    context.commit("SET_PEER", room);
  },
  nextPlayer: (context) => {
    context.commit("NEXT_PLAYER");
  },
  jailPlayer: (context) => {
    context.commit("JAIL_PLAYER");
  },
  incomeTax: (context) => {
    context.commit("INCOME_TAX");
  },
  luxuryTax: (context) => {
    context.commit("LUXURY_TAX");
  },
  freeParking: (context) => {
    context.commit("FREE_PARKING");
  },
};

const getters = {
  getState: state => {
    return {
      state: state.state,
      turns: state.turns.concat([state.currentTurn]),
    }
  },
  getTax: state => {
    return state.state.taxes.toNumber();
  },
  getSpaces: state => {
    return state.state.spaces || false; // mapstate
  },
  getProperty: state => propertyName => {
    return state.state.spaces.find(space => space.name == propertyName) || false;
  },
  getPropertiesByColor: state => color => {
    return state.state.spaces.filter(space => space.color === color) || false;
  },
  getMonopolies: state => address => {
    // console.log(groupBy(state.properties, "color"));
    return Object.entries(groupBy(state.state.spaces.filter(space => Object.keys(properties).includes(space.name)), "color"))
      .map(value => {
        return {
          [value[0]]: value[1].map(property => property.owner)
        };
      })
      .map(value => {
        return {
          [Object.keys(value)[0]]: Object.values(value)[0].length ===
            Object.values(value)[0].filter(name => name === address).length
        };
      });
  },
  getCurrentPlayerMonopolies: state => {
    // console.log(groupBy(state.properties, "color"));
    return Object.entries(groupBy(state.state.spaces.filter(space => Object.keys(properties).includes(space.name)), "color"))
      .map(value => {
        return {
          [value[0]]: value[1].map(property => property.owner)
        };
      })
      .map(value => {
        return {
          [Object.keys(value)[0]]: Object.values(value)[0].length ===
            Object.values(value)[0].filter(name => name === state.state.players[state.state.currentPlayer.toNumber()])
              .length
        };
      });
  },
  getPropertyOwner: state => property => {
    const owner = state.state.spaces.find(space => space.name == property).owner;
    if (owner != AddressZero) return owner
    else return false
  },
  getPlayer: state => address => {
    return state.state.players.find(player => player.id == address) || false;
  },
  getPlayerProperties: state => address => {
    return state.state.spaces.filter(space => space.owner == address) || false;
  },
  getCurrentPlayer: state => {
    return state.state.players[state.state.currentPlayer.toNumber()] || false; // remove
  },
  getSortedPlayers: state => {
    return orderBy(state.state.players, ["balance", "name"], ["desc", "asc"]);
  },
  getPlayers: state => {
    return state.state.players || false; // mapState
  },
  getPlayerPositions: state => {
    return state.state.players.map(player => {
      return {
        [player.name]: player.position
      };
    });
  },
  getCurrentPlayerPosition: state => {
    return state.state.players[state.state.currentPlayer.toNumber()].position || 0;
  },
  getPlayerSpace: state => address => {
    return state.state.spaces[state.state.players[state.state.players.findIndex(player => player.id == address)].position];
  },
  getCommunityChest: state => {
    return state.state.communityChest[rand(state.state.nonce.toNumber(), state.state.players[state.state.currentPlayer.toNumber()].id, state.state.channelId, 2, state.state.communityChest.length)];
  },
  getChance: state => {
    return state.state.communityChest[rand(state.state.nonce.toNumber(), state.state.players[state.state.currentPlayer.toNumber()].id, state.state.channelId, 2, state.state.chance.length)];
  },
  getDiceRoll: state => {
    return state.state.players.length > 0 ? [0, 1].map(i => rand(state.state.nonce.toNumber(), state.state.players[state.state.currentPlayer.toNumber()].id, state.state.channelId, i, 6) + 1) : [];
  },
  getSelfUsername: state => {
    return state.connection.initialized && state.connection.username;
  },
  getSelfAddress: state => {
    return state.connection.initialized && state.connection.getSigningAddress();
  },
  getSelfIsCurrentPlayer: state => {
    return state.connection.initialized && (state.connection.getSigningAddress() == state.state.players[state.state.currentPlayer.toNumber()].id);
  },
  getConnection: state => {
    return state.connection;
  }
};

export default new Vuex.Store({
  state,
  mutations,
  actions,
  getters,
  plugins: [connectionSync]
});