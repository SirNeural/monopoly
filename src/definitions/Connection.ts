import Peer from 'peerjs';
import { MonopolyClient } from './MonopolyClient';
import { monopolyFactory } from './Monopoly';
import { ChannelClient } from '@statechannels/channel-client';
import { ChannelState } from './Channel';
import { AppData } from './types';
import { HashZero } from 'ethers/constants';
import { CONTRACT_ADDRESS } from '../constants/contract';
import { MonopolyFactory } from '../../typechain/MonopolyFactory';
import { bigNumberify } from 'ethers/utils';
import ethers from 'ethers';
const niceware = require("niceware")

export class Connection {
    private self;
    private name;
    private channelClient;
    private channelProvider;
    public channelState;
    public channelStateCount;
    private host: boolean;
    public playerCount;
    public players;
    public id;

    constructor(name: string, channelProvider, host: boolean = false) {
        this.name = name;
        this.host = host;
        this.players = new Map();
        this.playerCount = 0;
        this.channelStateCount = 0;
        this.id = niceware.generatePassphrase(8).join('-').toLowerCase();
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
                if (host) {// && !this.players.has(conn.peer) {
                    console.log('Received new connection from ' + conn.peer)
                    console.log('Sending existing peers ' + JSON.stringify(Array.from(this.players.keys())));
                    conn.send({ type: 'sync', data: Array.from(this.players.keys()) });
                }
                conn.send({ type: 'setName', data: this.name });
                if (!this.players.has(conn.peer)) {
                    console.log('Adding new connection to peers list')
                    this.players.set(conn.peer, { name: conn.metadata.name, conn: conn });
                    this.playerCount++;
                    console.log(this.players);
                    console.log(this.playerCount);
                }
            });
        });
        this.channelProvider = channelProvider;
        this.setChannelClient();
    }

    public setChannelClient () {
        console.log('creating channel client');
        this.channelClient = new MonopolyClient(new ChannelClient(this.channelProvider));
        this.channelClient.onMessageQueued((message) => {
            console.log('sending data');
            console.log(message);
            this.sendData({ type: "message", data: message });
        });
        this.channelClient.onChannelUpdated((channelState: ChannelState<AppData>) => {
            console.log('received channel update');
            console.log(channelState);
            this.channelState = channelState;
            this.channelStateCount++;
        })
    }

    peersAsParticipants () {
        let participants = [{ destination: this.channelProvider.destinationAddress, participantId: this.channelProvider.signingAddress, signingAddress: this.channelProvider.signingAddress }]
        return participants.concat(Array.from(this.players.keys()).filter(player => player != this.id).map(id => {
            const player = this.players.get(id);
            return { destination: player.conn.metadata.destinationAddress, participantId: player.conn.metadata.signingAddress, signingAddress: player.conn.metadata.signingAddress }
        }));
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
        this.channelState = await this.channelClient.createChannel(
            participants,
            allocations,
            monopolyFactory(participants)
        );
        console.log(this.channelState);
    }

    async applyChange () {
        const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
        const contract = MonopolyFactory.connect(CONTRACT_ADDRESS, provider);
        //contract.apply
    }

    public joinRoom (roomId: string, joiningHost = false) {
        if (!this.players.has(roomId)) {
            const conn = this.self.connect(roomId, { metadata: { name: this.name, destinationAddress: this.channelProvider.destinationAddress, signingAddress: this.channelProvider.signingAddress } });
            conn.on('open', () => {
                console.log("established connection to host");
            });
            conn.on('data', async (data) => {
                await this.parseData(conn, data);
            });
            this.players.set(roomId, {name: '', conn: conn});
            this.playerCount++;
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
                this.players.set(conn.peer, { name: data.data, conn: conn });
                this.playerCount++;
                break;
            case 'message':
                console.log('sending wallet message');
                console.log(data.data);
                await this.channelClient.pushMessage(data.data);
                break;
        }
    }

    sendData (data) {
        this.players.forEach(player => {
            if (Object.prototype.hasOwnProperty.call(player, 'conn'))
                player.conn.send(data);
        });
    }
}