import Peer from 'peerjs';
import { MonopolyClient } from './MonopolyClient';
import { monopolyDataFactory, rand } from './Monopoly';
import { ChannelClient } from '@statechannels/channel-client';
import { ChannelState } from './Channel';
import { AppData, MonopolyData, Turn } from './types';
import { HashZero } from 'ethers/constants';
// import { MonopolyFactory } from '../../typechain/MonopolyFactory';
// import { InfuraProvider } from 'ethers/providers'
// import { CONTRACT_ADDRESS } from '../constants/contract'
const niceware = require("niceware")

export class Connection {
    public id;
    private provider;
    private client;
    private contract;
    private participants;
    private self;
    private name;
    private state;
    private store;
    private avatar;

    constructor(name: string, provider, store, stateCallback, host: boolean = false) {
        this.id = niceware.generatePassphrase(8).join('-').toLowerCase();
        // this.contract = MonopolyFactory.connect(CONTRACT_ADDRESS, new InfuraProvider("goerli", process.env.INFURA_API_KEY));
        this.name = name;
        this.store = store;
        this.participants = new Map();
        this.self = new Peer(this.id, {
            config: {
                'iceServers': [{
                    urls: "stun:numb.viagenie.ca",
                    username: "bradebreeze@jourrapide.com",
                    credential: "Ohm2quiefad"
                },
                {
                    urls: "turn:numb.viagenie.ca",
                    username: "bradebreeze@jourrapide.com",
                    credential: "Ohm2quiefad"
                }]
            }
        });
        this.self.on('connection', (conn) => {
            console.log('connection opened');
            conn.on('data', async (data) => {
                console.log("parsing received data")
                await this.parseData(conn, data);
            });
            conn.on('open', () => {
                if (host) {// && !this.participants.has(conn.peer) {
                    console.log('Received new connection from ' + conn.peer)
                    console.log('Sending existing peers ' + JSON.stringify(Array.from(this.participants.keys())));
                    conn.send({ type: 'sync', data: Array.from(this.participants.keys()) });
                }
                console.log('connection opened, sending new player to vuex')
                console.log(conn.metadata.signingAddress);
                this.store.dispatch('newPlayer', { username: conn.metadata.name, address: conn.metadata.signingAddress})
                conn.send({ type: 'setName', data: this.name });
                if (!this.participants.has(conn.peer)) {
                    console.log('Adding new connection to peers list')
                    this.participants.set(conn.peer, { name: conn.metadata.name, conn: conn });
                    console.log(this.participants);
                }
            });
        });
        this.provider = provider;
        this.setChannelClient(stateCallback);
    }

    setChannelClient (stateCallback) {
        console.log('creating channel client');
        this.client = new MonopolyClient(new ChannelClient(this.provider));
        this.client.onMessageQueued((message) => {
            console.log('sending data');
            console.log(message);
            this.sendData({ type: "message", data: JSON.stringify(message) });
        });
        this.client.onChannelUpdated((channelState: ChannelState<AppData>) => {
            console.log('received channel update');
            console.log(channelState);
            this.state = channelState;
            this.store.dispatch('setState', channelState.appData);
            stateCallback(channelState.appData)
            switch (channelState.status) {
                case 'proposed':
                    this.client.joinChannel(channelState.channelId);
            }
            // save to vuex
        });
        console.log('adding self to vuex')
        console.log(this.provider.signingAddress);
        this.store.dispatch('newPlayer', { username: this.name, address: this.provider.signingAddress });
    }
    public random (nonce, sender, channelId, offset, max) {
        return rand(nonce, sender, channelId, offset, max);
        // const remote = await this.contract.rand(nonce, sender, channelId, offset, max);
    }

    setAvatar (avatar: string) {
        this.avatar = avatar;
        this.sendData({ type: 'setAvatar', data: this.avatar });
    }

    peersAsParticipants (username = false) {
        let self = [{ ...(username && { username: this.name }), ...(this.avatar && { avatar: this.avatar }), destination: this.provider.destinationAddress, participantId: this.provider.signingAddress, signingAddress: this.provider.signingAddress }]
        return self.concat(Array.from(this.participants.keys()).filter(player => player != this.id).map(id => {
            const player = this.participants.get(id);
            return { ...(username && { username: player.name }), ...(player.avatar && { avatar: player.avatar }), destination: player.conn.metadata.destinationAddress, participantId: player.conn.metadata.signingAddress, signingAddress: player.conn.metadata.signingAddress }
        }));
    }

    getSigningAddress () {
        return this.provider.signingAddress;
    }

    async createChannel () {
        console.log('creating channel');
        const participants = this.peersAsParticipants();
        console.log(participants);
        const allocations = [{
            token: '0x0',
            allocationItems: participants.map(participants => ({ destination: participants.destination, amount: HashZero }))
        }];
        console.log(allocations);
        this.state = await this.client.createChannel(
            participants,
            allocations,
            monopolyDataFactory(this.peersAsParticipants(true))
        );
        this.store.dispatch('setState', this.state.appData);
        // save to vuex
        console.log(this.state);
    }

    async updateChannel () {
        const provisionalState = this.store.getters.getState;
        console.log('updating channel')
        console.log(provisionalState);
        this.state = await this.client.updateChannel(this.state.channelId, this.state.allocations, provisionalState);
    }

    // async applyChange (transition: string, turn: Turn) {
    //     //await this.contract[transition](state, turn);
    //     const provisionalState = {
    //         ...this.state,
    //         appData: {
    //             ...this.state.appData,
    //             ...this.store.getters.state
    //         }
    //     }
    //     this.state = await this.client.updateChannel(this.state.channelId, this.state.allocations, provisionalState);
    //     this.store.dispatch('setState', this.state.appData);
    //     // save to vuex
    // }

    public joinRoom (roomId: string) {
        if (!this.participants.has(roomId)) {
            const conn = this.self.connect(roomId, { metadata: { name: this.name, destinationAddress: this.provider.destinationAddress, signingAddress: this.provider.signingAddress } });
            conn.on('open', () => {
                console.log("established connection to host");
            });
            conn.on('data', async (data) => {
                await this.parseData(conn, data);
            });
            this.participants.set(roomId, { name: '', conn: conn });
        }
    }

    async parseData (conn, data) {
        console.log("received data " + JSON.stringify(data));
        switch (data.type) {
            case 'sync':
                data.data.forEach(peer => {
                    this.joinRoom(peer);
                });
                break;
            case 'setName':
                this.participants.set(conn.peer, { name: data.data, conn: conn });
                console.log('sent connection to player, adding to vuex')
                console.log(this.provider.signingAddress);
                this.store.dispatch('newPlayer', { username: data.data, address: conn.metadata.signingAddress })
                break;
            case 'setAvatar':
                this.participants.set(conn.peer, { ...this.participants.get(conn.peer), avatar: data.data });
                break;
            case 'message': {
                const message = JSON.parse(data.data);
                if (message.recipient == this.provider.signingAddress) {
                    console.log('sending wallet message');
                    console.log(message);
                    await this.client.pushMessage(message);
                } else {
                    console.log('found message for other user ' + message.recipient)
                    console.log('our id is' + this.provider.signingAddress)
                }
                break;
            }
        }
    }

    sendData (data) {
        this.participants.forEach(player => {
            if (Object.prototype.hasOwnProperty.call(player, 'conn'))
                player.conn.send(data);
        });
    }
}