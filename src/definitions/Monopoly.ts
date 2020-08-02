import { MonopolyData, MonopolyState, PropertyStatus, SpaceType, AppData, PositionType, ActionType } from './types';
import { Participant } from '@statechannels/client-api-schema';
import { defaultAbiCoder, bigNumberify } from 'ethers/utils';
import { spaces, properties } from '../store/properties.json';
import { chance, communityChest } from '../store/cards.json';

function toMonopolyData (appData: AppData): MonopolyData {
    const defaults: MonopolyData = {
        positionType: appData.type,
        state: {
            channelId: '',
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
            channelId: '',
            nonce: bigNumberify(0),
            currentPlayer: bigNumberify(0),
            houses: bigNumberify(32),
            hotels: bigNumberify(12),
            players: players.map(player => ({ name: player.participantId, id: player.signingAddress, bankrupt: false, balance: 1500, jailed: false, doublesRolled: 0, position: 0, getOutOfJailFreeCards: 0 })),
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
    } else if (space.contains('Community Chest')) {
        return SpaceType.CommunityChest;
    } else if (space.contains('Income Tax')) {
        return SpaceType.IncomeTax;
    } else if (space.contains('Railroad') || space.contains('Short Line')) {
        return SpaceType.Railroad;
    } else if (space.contains('Chance')) {
        return SpaceType.Chance;
    } else if (space.contains('Electric Company') || space.contains('Waterworks')) {
        return SpaceType.Utility;
    } else if (space.contains('Free Parking')) {
        return SpaceType.FreeParking;
    } else if (space.contains('Go to Jail')) {
        return SpaceType.GoToJail;
    } else if (space.contains('Luxury Tax')) {
        return SpaceType.LuxuryTax;
    } else if (space.contains('Jail')) {
        return SpaceType.Jail;
    } else if (space.contains('Go')) {
        return SpaceType.Go;
    }
}

export function loadCards (cards) {
    return cards.map((card) => {
        return {
            message: card.message,
            amount: bigNumberify(card.amount),
            action: card.action,
        }
    });
}

export function loadSpaces (spaces, properties) {
    return spaces.map((space, i) => {
        return {
            id: bigNumberify(i),
            spaceType: spaceToType(properties, space),
            propertyStatus: PropertyStatus.Unowned,
            prices: Object.prototype.hasOwnProperty.call(properties, space) ? properties[space].rent : [],
            housePrice: Object.prototype.hasOwnProperty.call(properties, space) ? properties[space].house : []
        };
    })
}

export function encodeAppData (appData: AppData): string {
    return encodeMonopolyData(toMonopolyData(appData));
}

export function encodeMonopolyData (monopolyData: MonopolyData): string {
    const appStateBytes = defaultAbiCoder.encode(
        ['tuple(bytes32 channelId, uint256 nonce, uint256 currentPlayer, uint256 houses, uint256 hotels, Player[] players, Space[40] spaces, Card[16] chance, Card[17] communityChest)'],
        [monopolyData.state]
    );
    const monopolyState = { ...monopolyData, appStateBytes: appStateBytes };
    return defaultAbiCoder.encode(
        [
            'tuple(uint256 stake, uint8 positionType, bytes appStatebytes, Turn[] turns)',
        ],
        [monopolyState]
    );
}

export function decodeAppData (appDataBytes: string): AppData {
    const parameters = defaultAbiCoder.decode(
        [
            'tuple(uint256 stake, uint8 positionType, bytes appStatebytes, Turn[] turns)',
        ],
        appDataBytes
    )[0];

    const stake = parameters[0].toString();
    const type = parameters[1] as PositionType;
    const monopolyState = defaultAbiCoder.decode(
        ['tuple(bytes32 channelId, uint256 nonce, uint256 currentPlayer, uint256 houses, uint256 hotels, Player[] players, Space[40] spaces, Card[16] chance, Card[17] communityChest)'],
        [parameters[2]]
    );

    const turns = parameters[3];//.map(a => {});
    return {
        stake,
        type,
        monopolyState,
        turns
    } as AppData;
}