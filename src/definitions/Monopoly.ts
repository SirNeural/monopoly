import { MonopolyData, MonopolyState, PropertyStatus, SpaceType, AppData, PositionType, ActionType } from './types';
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
            spaces: loadSpaces(spaces, properties),
            chance: loadCards(chance),
            communityChest: loadCards(communityChest)
        },
        turns: [],
    };

    return { ...defaults, ...appData };
}

export function spaceToType (properties, space) {
    if (properties.hasOwnProperty(space)) {
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
            prices: properties.hasOwnProperty(space) ? properties[space].rent : [],
            housePrice: properties.hasOwnProperty(space) ? properties[space].house : []
        };
    })
}

export function encodeAppData (appData: AppData): string {
    return encodeMonopolyData(toMonopolyData(appData));
}

export function encodeMonopolyData (monopolyData: MonopolyData): string {
    return defaultAbiCoder.encode(
        [
            'tuple(uint8 positionType, uint256 stake, uint256 nonce, uint8 currentPlayer, uint8 houses, uint8 hotels, Space[40] spaces, Player[] players)',
        ],
        [monopolyData]
    );
}

export function decodeAppData (appDataBytes: string): AppData {
    const parameters = defaultAbiCoder.decode(
        [
            'tuple(uint8 positionType, uint256 stake, uint256 nonce, uint8 currentPlayer, uint8 houses, uint8 hotels, Space[40] spaces, Player[] players)',
        ],
        appDataBytes
    )[0];

    const type = parameters[0] as PositionType;
    const stake = parameters[1].toString();
    const currentPlayer = parameters[2];
    const houses = parameters[3];
    const hotels = parameters[4];
    const players = parameters[5];
    return {
        type,
        stake,
        currentPlayer,
        houses,
        hotels,
        players
    } as AppData;
}