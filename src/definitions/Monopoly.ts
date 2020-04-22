import { Player } from './Player'
import { defaultAbiCoder, bigNumberify } from 'ethers/utils';
export enum PositionType {
    Start, // Setup game, allocate funds
    Rolling, //
    Moving,
    Action,
    Maintenance,
    NextPlayer,
    Bankrupt,
    End
}

export interface Start {
    stake: string;
    type: PositionType.Start;
}
export interface Rolling {
    stake: string;
    type: PositionType.Rolling;
}
export interface Moving {
    stake: string;
    type: PositionType.Moving;
}
export interface Action {
    stake: string;
    type: PositionType.Action;
}
export interface Maintenance {
    stake: string;
    type: PositionType.Maintenance;
}
export interface NextPlayer {
    stake: string;
    type: PositionType.NextPlayer;
}
export interface Bankrupt {
    stake: string;
    type: PositionType.Bankrupt;
}
export interface End {
    stake: string;
    type: PositionType.End;
}

export type AppData = Start | Rolling | Moving | Action | Maintenance | NextPlayer | Bankrupt | End;


export enum ActionType {
    BuyProperty,
    AuctionProperty,
    PayRent,
    PayUtilities,
    PayIncomeTax,
    PayLuxuryTax,
    GoToJail,
    CommunityCard,
    ChanceCard,
    FreeParking
    //Pass Go?
}
export enum MaintainanceType {
    MortgageProperty,
    AddHouse,
    RemoveHouse,
    AddHotel,
    RemoveHotel
    // Trade
}

export interface MonopolyData {
    positionType: PositionType;
    stake: string; // this is contributed by each player. If you win, you get your stake back as well as the stake of the other player. If you lose, you lose your stake.
    currentPlayer: number;
    // moveNum: string;
    blockNum: string;
    houses: number; // find max and limit data structure
    hotels: number; // find max and limit data structure
    // Num houses/hotels
    players: Player[];
}

function toMonopolyData (appData: AppData): MonopolyData {
    const defaults: MonopolyData = {
        positionType: appData.type,
        stake: bigNumberify(0).toString(),
        currentPlayer: 0,
        houses: 32,
        hotels: 12,
        blockNum: bigNumberify(0).toString(),
        players: [],
    };

    return { ...defaults, ...appData };
}

export function encodeAppData (appData: AppData): string {
    return encodeMonopolyData(toMonopolyData(appData));
}

export function encodeMonopolyData (monopolyData: MonopolyData): string {
    return defaultAbiCoder.encode(
        [
            'tuple(uint8 positionType, uint256 stake, uint256 currentPlayer, uint8 houses, uint8 hotels, Player[] players)',
        ],
        [monopolyData]
    );
}

export function decodeAppData (appDataBytes: string): AppData {
    const parameters = defaultAbiCoder.decode(
        [
            'tuple(uint8 positionType, uint256 stake, uint256 currentPlayer, uint8 houses, uint8 hotels, Player[] players)',
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