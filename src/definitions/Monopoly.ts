// @ts-ignore
import { Uint256, Bytes32, Address } from '@statechannels/client-api-schema/src/types'
import { MonopolyData, MonopolyState, PropertyStatus, SpaceType, AppData, PositionType, ActionType, MonopolyParticipant } from './types';
import { randomChannelId } from '@statechannels/nitro-protocol';
import { defaultAbiCoder, bigNumberify, keccak256, arrayify } from 'ethers/utils';
import { AddressZero, HashZero } from 'ethers/constants';
import { spaces, properties } from '../store/properties.json';
import { chance, communityChest } from '../store/cards.json';

function toMonopolyData (appData: AppData): MonopolyData {
    const defaults: MonopolyData = {
        state: {
            channelId: randomChannelId(),
            nonce: bigNumberify(0),
            currentPlayer: bigNumberify(0),
            taxes: bigNumberify(0),
            positionType: appData.type,
            houses: 32,
            hotels: 12,
            players: [],
            spaces: [],
            chance: [],
            communityChest: []
        },
        turns: [],
    };

    return { ...defaults, ...appData };
}

export function monopolyDataFactory (players: MonopolyParticipant[]): MonopolyData {
    return {
        state: {
            channelId: randomChannelId(),
            nonce: bigNumberify(0),
            currentPlayer: bigNumberify(0),
            taxes: bigNumberify(0),
            positionType: PositionType.Start,
            houses: 32,
            hotels: 12,
            players: players.map(player => ({ name: player.username ?? player.signingAddress, avatar: player.avatar ?? 'pig', id: player.signingAddress, bankrupt: false, balance: bigNumberify(1500), jailed: 0, doublesRolled: 0, position: 0, getOutOfJailFreeCards: 0 })),
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
            name: space,
            color: Object.prototype.hasOwnProperty.call(properties, space) ? properties[space].color : '',
            id: i,
            spaceType: spaceToType(properties, space),
            status: PropertyStatus.Unowned,
            prices: Object.prototype.hasOwnProperty.call(properties, space) ? [properties[space].price].concat(properties[space].rent, [properties[space].mortgage]).map(price => bigNumberify(price)) : [],
            housePrice: Object.prototype.hasOwnProperty.call(properties, space) ? bigNumberify(properties[space].house) : bigNumberify(0),
            owner: AddressZero
        };
    })
}

export function turnFactory (player: Uint256) {
    return {
        player: player,
        purchased: [],
        mortgaged: [],
        unmortgaged: [],
        housesAdded: [],
        housesRemoved: []
    }
}

export function rand (nonce: Uint256,
    sender: Address,
    channelId: Bytes32,
    offset: number,
    max: number) {
    return arrayify(
        keccak256(
            defaultAbiCoder.encode(
                ['tuple(uint256 nonce, address sender, bytes32 channelId)'],
                [{ nonce: nonce, sender: sender, channelId: channelId}]
            )
        )
    )[offset] % max;
}

export function encodeAppData (appData: AppData): string {
    return encodeMonopolyData(toMonopolyData(appData));
}

export function encodeMonopolyData (monopolyData: MonopolyData): string {
    const playersBytes = defaultAbiCoder.encode(
        ['tuple(string name, string avatar, address id, bool bankrupt, uint256 balance, uint8 jailed, uint8 doublesRolled, uint8 position, uint8 getOutOfJailFreeCards)[]'],
        [monopolyData.state.players]
    );
    const spacesBytes = defaultAbiCoder.encode(
        ['tuple(string name, string color, uint8 spaceType, uint8 status, uint8 id, uint256[] prices, uint256 housePrice, address owner)[]'],
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
        ['tuple(bytes32 channelId, uint256 nonce, uint256 currentPlayer, uint256 taxes, uint8 positionType, uint8 houses, uint8 hotels, bytes playersBytes, bytes spacesBytes, bytes chanceBytes, bytes communityChestBytes)'],
        [encodedMonopolyState]
    );
    const appTurnBytes = defaultAbiCoder.encode(
        ['tuple(uint256 player, uint8[] purchased, uint8[] mortgaged, uint8[] unmortgaged, uint8[] housesAdded, uint8[] housesRemoved)[]'],
        [monopolyData.turns]
    )
    const encodedMonopolyData = { ...monopolyData, appStateBytes: appStateBytes, appTurnBytes: appTurnBytes };
    return defaultAbiCoder.encode(
        [
            'tuple(bytes appStateBytes, bytes appTurnBytes)',
        ],
        [encodedMonopolyData]
    );
}

export function decodeAppData (appDataBytes: string): AppData {
    const parameters = defaultAbiCoder.decode(
        [
            'tuple(bytes appStateBytes, bytes appTurnBytes)',
        ],
        appDataBytes
    )[0];
    const monopolyState = defaultAbiCoder.decode(
        ['tuple(bytes32 channelId, uint256 nonce, uint256 currentPlayer, uint256 taxes, uint8 positionType, uint8 houses, uint8 hotels, bytes playersBytes, bytes spacesBytes, bytes chanceBytes, bytes communityChestBytes)'],
        parameters.appStateBytes
    )[0];
    const players = defaultAbiCoder.decode(
        ['tuple(string name, string avatar, address id, bool bankrupt, uint256 balance, uint8 jailed, uint8 doublesRolled, uint8 position, uint8 getOutOfJailFreeCards)[]'],
        monopolyState.playersBytes
    )[0].map(item => ({
        name: item.name,
        avatar: item.avatar,
        id: item.id,
        bankrupt: item.bankrupt,
        balance: item.balance,
        jailed: item.jailed,
        doublesRolled: item.doublesRolled,
        position: item.position,
        getOutOfJailFreeCards: item.getOutOfJailFreeCards
    }));
    const spaces = defaultAbiCoder.decode(
        ['tuple(string name, string color, uint8 spaceType, uint8 status, uint8 id, uint256[] prices, uint256 housePrice, address owner)[]'],
        monopolyState.spacesBytes
    )[0].map(item => ({
        name: item.name,
        color: item.color,
        spaceType: item.spaceType,
        status: item.status,
        id: item.id,
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
        ['tuple(uint256 player, uint8[] purchased, uint8[] mortgaged, uint8[] unmortgaged, uint8[] housesAdded, uint8[] housesRemoved)[]'],
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
        state: {
            channelId: monopolyState.channelId,
            nonce: monopolyState.nonce,
            currentPlayer: monopolyState.currentPlayer,
            taxes: monopolyState.taxes,
            positionType: monopolyState.positionType as PositionType,
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