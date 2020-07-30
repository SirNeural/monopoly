import Peer from 'peerjs';
const niceware = require("niceware")

export class Connection {
    private self;
    private peers;
    private name;
    public id;

    constructor(name: string) {
        this.name = name;
        this.peers = [];
        this.id = niceware.generatePassphrase(8).join('-');
        this.self = new Peer(this.id, {
            host: '9000-a458f755-0419-47ad-928c-3d5c8ed5d902.ws-us02.gitpod.io', secure: true, /*config: {
                'iceServers': [{
                    'urls': [
                        'stun:stun.l.google.com:19302',
                        'stun:stun1.l.google.com:19302',
                        'stun:stun2.l.google.com:19302',
                        'stun:stun.l.google.com:19302?transport=udp',
                    ]
                }]
            }*/
        });
        this.self.on('connection', (conn) => {
            console.log('connection opened');
            conn.on('data', (data) => {
                this.parseData(data);
            });
            if (!this.peers.some(peer => peer.peer === conn.peer)) {
                conn.on('open', () => {
                    console.log('Received new connection from ' + conn.peer)
                    conn.send(JSON.stringify({ type: 'sync', data: JSON.stringify(this.peers) }));
                });
                this.peers.push(conn);
            }
        });
    }

    public joinRoom (roomId: string) {
        this.self.connect(roomId, { metadata: { name: this.name } });
    }

    parseData (data) {
        console.log("received data " + data.type);
        switch (data.type) {
            case 'sync':
                JSON.parse(data.parseData).forEach(peer => {
                    this.joinRoom(peer.id);
                });
                break;
            case 'move':
                break;
        }
    }
}