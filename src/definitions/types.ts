// @ts-ignore
import { Uint256, Address } from '@statechannels/client-api-schema/src/types'

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

export interface HasStake {
    stake: Uint256;
}

export interface Start extends HasStake {
    type: PositionType.Start;
}
export interface Rolling extends HasStake {
    type: PositionType.Rolling;
}
export interface Moving extends HasStake {
    type: PositionType.Moving;
}
export interface Action extends HasStake {
    type: PositionType.Action;
}
export interface Maintenance extends HasStake {
    type: PositionType.Maintenance;
}
export interface NextPlayer extends HasStake {
    type: PositionType.NextPlayer;
}
export interface Bankrupt extends HasStake {
    type: PositionType.Bankrupt;
}
export interface End extends HasStake {
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

export enum SpaceType {
    Corner,
    Property,
    Railroad,
    Utility,
    Card,
    Tax
}
export enum CardActionType {
    PayMoney,
    CollectMoney,
    PayMoneyToAll,
    CollectMoneyFromAll,
    CollectMoneyFromBank,
    GoToJail,
    GetOutOfJailFree,
    MoveSpaces,
    MoveToSpace
}

export interface Space {
    spaceType: SpaceType;
    prices: number[];
    owner: Address;
    action: CardActionType;
}

export interface MonopolyData {
    positionType: PositionType;
    stake: string; // this is contributed by each player. If you win, you get your stake back as well as the stake of the other player. If you lose, you lose your stake.
    currentPlayer: number;
    // moveNum: string;
    // blockNum: string;
    houses: number; // find max and limit data structure
    hotels: number; // find max and limit data structure
    // Num houses/hotels
    spaces: Space[];
    players: Player[];
}

export interface Player {
    name: string;
    id: Address;
    jailed: boolean;
    balance: number;
    doublesRolled: number;
    position: number;
    getOutOfJailFreeCards: number;
    properties: number[];
}