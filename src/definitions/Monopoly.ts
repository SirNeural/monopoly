import { MonopolyData, MonopolyState, PropertyStatus, SpaceType, AppData, PositionType, ActionType } from './types';
import { Participant } from '@statechannels/client-api-schema';
import { randomChannelId } from '@statechannels/nitro-protocol'
import { defaultAbiCoder, bigNumberify } from 'ethers/utils';
import { AddressZero, HashZero } from 'ethers/constants';
import { spaces, properties } from '../store/properties.json';
import { chance, communityChest } from '../store/cards.json';

function toMonopolyData (appData: AppData): MonopolyData {
    const defaults: MonopolyData = {
        positionType: appData.type,
        state: {
            channelId: randomChannelId(),
            nonce: bigNumberify(0),
            currentPlayer: bigNumberify(0),
            houses: bigNumberify(32),
            hotels: bigNumberify(12),
            players: [],
            spaces: [],
            chance: [],
            communityChest: []
        },
        turns: [],
    };

    return { ...defaults, ...appData };
}

export function monopolyFactory (players: Participant[]): MonopolyData {
    return {
        positionType: PositionType.Start,
        state: {
            channelId: randomChannelId(),
            nonce: bigNumberify(0),
            currentPlayer: bigNumberify(0),
            houses: bigNumberify(32),
            hotels: bigNumberify(12),
            players: players.map(player => ({ name: player.participantId, id: player.signingAddress, bankrupt: false, balance: 1500, jailed: 0, doublesRolled: 0, position: 0, getOutOfJailFreeCards: 0 })),
            spaces: loadSpaces(spaces, properties),
            chance: loadCards(chance),
            communityChest: loadCards(communityChest)
        },
        turns: []
    }
}

export function spaceToType (properties, space) {
    if (Object.prototype.hasOwnProperty.call(properties, space)) {
        return SpaceType.Property;
    } else if (space.includes('Community Chest')) {
        return SpaceType.CommunityChest;
    } else if (space.includes('Income Tax')) {
        return SpaceType.IncomeTax;
    } else if (space.includes('Railroad') || space.includes('Short Line')) {
        return SpaceType.Railroad;
    } else if (space.includes('Chance')) {
        return SpaceType.Chance;
    } else if (space.includes('Electric Company') || space.includes('Waterworks')) {
        return SpaceType.Utility;
    } else if (space.includes('Free Parking')) {
        return SpaceType.FreeParking;
    } else if (space.includes('Go to Jail')) {
        return SpaceType.GoToJail;
    } else if (space.includes('Luxury Tax')) {
        return SpaceType.LuxuryTax;
    } else if (space.includes('Jail')) {
        return SpaceType.Jail;
    } else if (space.includes('Go')) {
        return SpaceType.Go;
    }
}

export function loadCards (cards) {
    return cards.map((card) => {
        return {
            message: card.message,
            amount: bigNumberify(card.amount),
            action: ActionType[card.action],
        }
    });
}

export function loadSpaces (spaces, properties) {
    return spaces.map((space, i) => {
        return {
            id: bigNumberify(i),
            spaceType: spaceToType(properties, space),
            status: PropertyStatus.Unowned,
            prices: Object.prototype.hasOwnProperty.call(properties, space) ? properties[space].rent : [],
            housePrice: Object.prototype.hasOwnProperty.call(properties, space) ? properties[space].house : [],
            owner: AddressZero
        };
    })
}

export function encodeAppData (appData: AppData): string {
    return encodeMonopolyData(toMonopolyData(appData));
}

export function encodeMonopolyData (monopolyData: MonopolyData): string {
    const playersBytes = defaultAbiCoder.encode(
        ['tuple(string name, address id, bool bankrupt, uint256 balance, uint256 jailed, uint256 doublesRolled, uint256 position, uint256 getOutOfJailFreeCards)[]'],
        [monopolyData.state.players]
    );
    const spacesBytes = defaultAbiCoder.encode(
        ['tuple(uint256 id, uint8 spaceType, uint8 status, uint256[] prices, uint256 housePrice, address owner)[]'],
        [monopolyData.state.spaces]
    );
    const chanceBytes = defaultAbiCoder.encode(
        ['tuple(uint256 amount, uint8 action, string message)[]'],
        [monopolyData.state.chance]
    );
    const communityChestBytes = defaultAbiCoder.encode(
        ['tuple(uint256 amount, uint8 action, string message)[]'],
        [monopolyData.state.communityChest]
    );
    const encodedMonopolyState = { ...monopolyData.state, playersBytes: playersBytes, spacesBytes: spacesBytes, chanceBytes: chanceBytes, communityChestBytes: communityChestBytes };
    const appStateBytes = defaultAbiCoder.encode(
        ['tuple(bytes32 channelId, uint256 nonce, uint256 currentPlayer, uint256 houses, uint256 hotels, bytes playersBytes, bytes spacesBytes, bytes chanceBytes, bytes communityChestBytes)'],
        [encodedMonopolyState]
    );
    const appTurnBytes = defaultAbiCoder.encode(
        ['tuple(uint256 player, uint256[] purchased, uint256[] mortgaged, uint256[] unmortgaged, uint256[] housesAdded, uint256[] housesRemoved)[]'],
        [monopolyData.turns]
    )
    const encodedMonopolyData = { ...monopolyData, appStateBytes: appStateBytes, appTurnBytes: appTurnBytes };
    return defaultAbiCoder.encode(
        [
            'tuple(uint8 positionType, bytes appStateBytes, bytes appTurnBytes)',
        ],
        [encodedMonopolyData]
    );
}

export function decodeAppData (appDataBytes: string): AppData {
    const parameters = defaultAbiCoder.decode(
        [
            'tuple(uint8 positionType, bytes appStateBytes, bytes appTurnBytes)',
        ],
        appDataBytes
    )[0];

    //const stake = parameters.stake.toString();
    const positionType = parameters.positionType as PositionType;
    const monopolyState = defaultAbiCoder.decode(
        ['tuple(bytes32 channelId, uint256 nonce, uint256 currentPlayer, uint256 houses, uint256 hotels, bytes playersBytes, bytes spacesBytes, bytes chanceBytes, bytes communityChestBytes)'],
        parameters.appStateBytes
    )[0];
    const players = defaultAbiCoder.decode(
        ['tuple(string name, address id, bool bankrupt, uint256 balance, uint256 jailed, uint256 doublesRolled, uint256 position, uint256 getOutOfJailFreeCards)[]'],
        monopolyState.playersBytes
    )[0].map(item => ({
        name: item.name,
        id: item.id,
        bankrupt: item.bankrupt,
        balance: item.balance,
        jailed: item.jailed,
        doublesRolled: item.doublesRolled,
        position: item.position,
        getOutOfJailFreeCards: item.getOutOfJailFreeCards
    }));
    const spaces = defaultAbiCoder.decode(
        ['tuple(uint256 id, uint8 spaceType, uint8 status, uint256 prices, uint256 housePrice, address owner)[]'],
        monopolyState.spacesBytes
    )[0].map(item => ({
        id: item.id,
        spaceType: item.spaceType,
        status: item.status,
        prices: item.prices,
        housePrice: item.housePrice,
        owner: item.owner
    }));
    const chance = defaultAbiCoder.decode(
        ['tuple(uint256 amount, uint8 action, string message)[]'],
        monopolyState.chanceBytes
    )[0].map(item => ({
        amount: item.amount,
        action: item.action,
        message: item.message
    }));
    const communityChest = defaultAbiCoder.decode(
        ['tuple(uint256 amount, uint8 action, string message)[]'],
        monopolyState.communityChestBytes
    )[0].map(item => ({
        amount: item.amount,
        action: item.action,
        message: item.message
    }));
    const turns = defaultAbiCoder.decode(
        ['tuple(uint256 player, uint256[] purchased, uint256[] mortgaged, uint256[] unmortgaged, uint256[] housesAdded, uint256[] housesRemoved)[]'],
        parameters.appTurnBytes
    )[0].map(item => ({
        player: item.player,
        purchased: item.purchased,
        mortgaged: item.mortgaged,
        unmortgaged: item.unmortgaged,
        housesAdded: item.housesAdded,
        housesRemoved: item.housesRemoved
    }));

    return {
        positionType: positionType,
        state: {
            channelId: monopolyState.channelId,
            nonce: monopolyState.nonce,
            currentPlayer: monopolyState.currentPlayer,
            houses: monopolyState.houses,
            hotels: monopolyState.hotels,
            players: players,
            spaces: spaces,
            chance: chance,
            communityChest: communityChest,
        },
        turns: turns
    } as AppData;
}