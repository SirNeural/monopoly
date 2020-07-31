import Peer from 'peerjs';
import { ChannelClient } from './ChannelClient';
const niceware = require("niceware")

export class Connection {
    private self;
    private peers;
    private name;
    private channelClient = new ChannelClient();
    public id;

    constructor(name: string, channelProvider) {
        this.name = name;
        this.peers = [];
        this.id = niceware.generatePassphrase(8).join('-');
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
                await this.parseData(data);
            });
            conn.on('open', () => {
                if (!this.peers.some(peer => peer.peer === conn.peer)) {
                    console.log('Received new connection from ' + conn.peer)
                    console.log('Sending existing peers ' + JSON.stringify(this.peers.map(peer => peer.peer)));
                    conn.send({ type: 'sync', data: this.peers.map(peer => peer.peer) });
                    this.peers.push(conn);
                }
            });
        });
        this.setChannelProvider(channelProvider);
    }

    public setChannelProvider (channelProvider) {
        this.channelClient.enable(channelProvider);
        this.channelClient.onMessageQueued((message) => {
            this.sendData({ type: "message", data: message });
        })
    }

    public joinRoom (roomId: string) {
        if (!this.peers.some(peer => peer.peer === roomId)) {
            const conn = this.self.connect(roomId, { metadata: { name: this.name } });
            conn.on('open', () => {
                console.log("established connection to host");
            });
            conn.on('data', async (data) => {
                await this.parseData(data);
            });
            this.peers.push(conn);
        }
    }

    async parseData (data) {
        console.log("received data " + JSON.stringify(data));
        switch (data.type) {
            case 'sync':
                data.data.forEach(peer => {
                    this.joinRoom(peer);
                });
                break;
            case 'message':
                await this.channelClient.pushMessage(data.data);
                break;
        }
    }

    sendData (data) {
        this.peers.forEach(peer => {
            peer.send(data);
        });
    }
}