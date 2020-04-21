export const BOARD_LENGTH = 8;
export const WEBRTC_SERVER = 'gametest.decenter.com';
export const WEBRTC_API_KEY = 'peerjs';
export const WEBRTC_PORT = 4443;

export const CONTRACT_ADDRESS = '0x7c2c195cd6d34b8f845992d380aadb2730bb9c6f';

export const NUM_BLOCKS_FOR_CHANNEL = 60;

export const DEFAULT_PRICE = 1000000000000000; // 0.001 eth

export const REFRESH_LOBBY_TIME = 10000; //10s

export const TIMEOUT_WAIT_PERIOD = 60;

// In the board 0,1,2,3 represent the state of the ships
export const EMPTY_FIELD = 0;
export const PLAYERS_SHIP = 1;
export const MISSED_SHIP = 2;
export const SUNK_SHIP = 3;

export const SECONDS_PER_TURN = 30;

export const WALLET_URL = process.env.WALLET_URL || 'https://wallet.statechannels.org';