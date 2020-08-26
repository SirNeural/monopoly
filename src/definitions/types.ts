// @ts-ignore
import { Uint256, Bytes32, Address } from '@statechannels/client-api-schema/src/types'
import { Participant } from '@statechannels/client-api-schema';
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

export interface Start extends MonopolyData {
    type: PositionType.Start;
}
export interface Rolling extends MonopolyData {
    type: PositionType.Rolling;
}
export interface Moving extends MonopolyData {
    type: PositionType.Moving;
}
export interface Action extends MonopolyData {
    type: PositionType.Action;
}
export interface Maintenance extends MonopolyData {
    type: PositionType.Maintenance;
}
export interface NextPlayer extends MonopolyData {
    type: PositionType.NextPlayer;
}
export interface Bankrupt extends MonopolyData {
    type: PositionType.Bankrupt;
}
export interface End extends MonopolyData {
    type: PositionType.End;
}

export type AppData = Start | Rolling | Moving | Action | Maintenance | NextPlayer | Bankrupt | End;

export interface MonopolyParticipant extends Participant {
    username?: string;
    avatar?: string;
}

export enum SpaceType {
    Go,
    Property,
    Railroad,
    Utility,
    CommunityChest,
    Chance,
    LuxuryTax,
    IncomeTax,
    Jail,
    FreeParking,
    GoToJail
}

export enum ActionType {
    PayMoney,
    CollectMoney,
    PayMoneyToAll,
    CollectMoneyFromAll,
    GoToJail,
    GetOutOfJailFree,
    MoveSpaces,
    MoveBackSpaces,
    MoveToSpace,
    MoveToNearestUtility,
    MoveToNearestRailroad,
    PropertyAssessment,
    GeneralRepairs
}
export enum PropertyStatus {
    Unowned,
    Owned,
    Monopoly,
    SingleHouse,
    DoubleHouse,
    TripleHouse,
    QuadHouse,
    Hotel,
    Mortgaged
}

export interface Space {
    name: string;
    color: string;
    spaceType: SpaceType;
    status: PropertyStatus;
    id: number;
    prices: Uint256[];
    housePrice: Uint256;
    owner: Address;
}

export interface Turn {
    player: Uint256;
    purchased: number[];
    mortgaged: number[];
    unmortgaged: number[];
    housesAdded: number[];
    housesRemoved: number[];
}


export interface Card {
    message: string;
    amount: Uint256;
    action: ActionType;
}

export interface MonopolyState {
    channelId: Bytes32;
    nonce: Uint256;
    currentPlayer: Uint256;
    taxes: Uint256;
    positionType: PositionType;
    houses: number;
    hotels: number;
    players: Player[];
    spaces: Space[];
    chance: Card[];
    communityChest: Card[];
}

export interface MonopolyData {
    state: MonopolyState;
    turns: Turn[];
}

export interface Player {
    name: string;
    avatar: string;
    id: Address;
    bankrupt: boolean;
    balance: Uint256;
    jailed: number;
    doublesRolled: number;
    position: number;
    getOutOfJailFreeCards: number;
}