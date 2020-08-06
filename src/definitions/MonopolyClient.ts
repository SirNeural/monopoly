// @ts-ignore
import { ChannelClientInterface } from '@statechannels/channel-client';
// @ts-ignore
import { Message, Participant, Allocation, ChannelResult } from '@statechannels/client-api-schema';
import { ChannelState, toChannelState } from './Channel';
import { encodeAppData } from './Monopoly'
import { AppData } from './types'
import { CONTRACT_ADDRESS } from '../constants';

export class MonopolyClient {
  constructor(readonly channelClient: ChannelClientInterface) { }

  async enable () {
    //
  }

  async createChannel (
    participants: Participant[],
    allocations: Allocation[],
    appAttrs: AppData,
  ): Promise<ChannelState> {
    const appDefinition = CONTRACT_ADDRESS;
    const appData = encodeAppData(appAttrs);
    console.log('creating channelin client');
    console.log(this.channelClient);
    const channelResult = await this.channelClient.createChannel(
      participants,
      allocations,
      appDefinition,
      appData,
      'Direct'
    );
    console.log('converting result to channel state')
    console.log(channelResult);
    return toChannelState(channelResult);
  }

  onMessageQueued (callback: (message: Message) => void) {
    return this.channelClient.onMessageQueued(callback);
  }
  // Accepts an monopoly-friendly callback, performs the necessary encoding, and subscribes to the channelClient with an appropriate, API-compliant callback
  onChannelUpdated (appCallback: (channelState: ChannelState) => any) {
    function callback (channelResult: ChannelResult): any {
      appCallback(toChannelState(channelResult));
    }
    // These are two distinct events from the channel client
    // but for our purposes we can treat them the same
    // and rely on the channel status
    const unsubChannelUpdated = this.channelClient.onChannelUpdated(callback);
    const unsubChannelProposed = this.channelClient.onChannelProposed(callback);

    return () => {
      unsubChannelUpdated();
      unsubChannelProposed();
    };
  }

  async joinChannel (channelId: string) {
    const channelResult = await this.channelClient.joinChannel(channelId);
    return toChannelState(channelResult);
  }

  async closeChannel (channelId: string): Promise<ChannelState> {
    const channelResult = await this.channelClient.closeChannel(channelId);
    return toChannelState(channelResult);
  }

  async challengeChannel (channelId: string): Promise<ChannelState> {
    const channelResult = await this.channelClient.challengeChannel(channelId);
    return toChannelState(channelResult);
  }

  async updateChannel (
    channelId: string,
    allocations: Allocation[],
    appAttrs: AppData,
  ) {

    const appData = encodeAppData(appAttrs);

    // ignore return val for now and stub out response
    const channelResult = await this.channelClient.updateChannel(
      channelId,
      allocations,
      appData
    );

    return toChannelState(channelResult);
  }

  async pushMessage (message: Message) {
    await this.channelClient.pushMessage(message);
  }
}