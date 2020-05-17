import { MonopolyData, AppData, PositionType } from './types';
import { defaultAbiCoder, bigNumberify } from 'ethers/utils';

function toMonopolyData (appData: AppData): MonopolyData {
    const defaults: MonopolyData = {
        positionType: appData.type,
        stake: bigNumberify(0).toString(),
        nonce: bigNumberify(0).toString(),
        currentPlayer: 0,
        houses: 32,
        hotels: 12,
        // blockNum: bigNumberify(0).toString(),
        players: [],
        spaces: [], // initialize this to the spaces we defined
    };

    return { ...defaults, ...appData };
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