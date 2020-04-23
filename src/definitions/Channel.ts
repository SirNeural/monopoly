// @ts-ignore
import { ChannelResult, ChannelStatus, Participant, Allocation, Address, ChannelId, Uint256 } from '@statechannels/client-api-schema';

import {
    decodeAppData,
    AppData,
    Start,
    Rolling,
    Moving,
    Action,
    Maintenance,
    NextPlayer,
    Bankrupt,
    End,
    PositionType
} from './Monopoly';

export interface ChannelState<T = AppData> {
    participants: Participant[];
    allocations: Allocation[];
    appData: T;
    appDefinition: Address;
    channelId: ChannelId;
    status: ChannelStatus;
    turnNum: Uint256;
    challengeExpirationTime?: number;
}

export type MaybeChannelState = ChannelState | null;

export const isChallenging = (state: MaybeChannelState): state is ChannelState =>
    (state && state.status === 'challenging') || false;

export const isResponding = (state: MaybeChannelState): state is ChannelState =>
    (state && state.status === 'responding') || false;

export const isChallengingOrResponding = (state: MaybeChannelState): state is ChannelState =>
    isChallenging(state) || isResponding(state);

export const isClosing = (state: MaybeChannelState): state is ChannelState =>
    (state && state.status === 'closing') || false;

export const isClosed = (state: MaybeChannelState): state is ChannelState =>
    (state && state.status === 'closed') || false;

export const isEmpty = (state: MaybeChannelState): state is null => !state;

export const inChannelProposed = (state: MaybeChannelState): state is ChannelState =>
    (state && state.status === 'proposed') || false;

export const isRunning = (state: MaybeChannelState): state is ChannelState =>
    (state && state.status === 'running') || false;

export const inStart = (state: MaybeChannelState): state is ChannelState<Start> =>
    (state && state.appData.type === PositionType.Start) || false;

export const inRolling = (state: MaybeChannelState): state is ChannelState<Rolling> =>
    (state && state.appData.type === PositionType.Rolling) || false;

export const inMoving = (state: MaybeChannelState): state is ChannelState<Moving> =>
    (state && state.appData.type === PositionType.Moving) || false;

export const inAction = (state: MaybeChannelState): state is ChannelState<Action> =>
    (state && state.appData.type === PositionType.Action) || false;

export const inMaintenance = (state: MaybeChannelState): state is ChannelState<Maintenance> =>
    (state && state.appData.type === PositionType.Maintenance) || false;

export const inNextPlayer = (state: MaybeChannelState): state is ChannelState<NextPlayer> =>
    (state && state.appData.type === PositionType.NextPlayer) || false;

export const inBankrupt = (state: MaybeChannelState): state is ChannelState<Bankrupt> =>
    (state && state.appData.type === PositionType.Bankrupt) || false;

export const inEnd = (state: MaybeChannelState): state is ChannelState<End> =>
    (state && state.appData.type === PositionType.End) || false;

export const toChannelState = (channelResult: ChannelResult): ChannelState => {
    return {
        ...channelResult,
        appData: decodeAppData(channelResult.appData)
    };
};
