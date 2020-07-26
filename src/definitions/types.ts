// @ts-ignore
import { Uint256, Bytes32, Address } from '@statechannels/client-api-schema/src/types'

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
    id: Uint256;
    spaceType: SpaceType;
    status: PropertyStatus;
    prices: Uint256[];
    housePrice: Uint256;
    owner: Address;
}

export interface Turn {
    player: Uint256;
    purchased: Uint256[];
    mortgaged: Uint256[];
    unmortgaged: Uint256[];
    housesAdded: Uint256[];
    housesRemoved: Uint256[];
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
    houses: Uint256;
    hotels: Uint256;
    players: Player[];
    spaces: Space[];
    chance: Card[];
    communityChest: Card[];
}

export interface MonopolyData {
    positionType: PositionType;
    state: MonopolyState;
    turns: Turn[];
}

export interface Player {
    name: string;
    id: Address;
    bankrupt: boolean;
    balance: Uint256;
    jailed: Uint256;
    doublesRolled: Uint256;
    position: Uint256;
    getOutOfJailFreeCards: Uint256;
}