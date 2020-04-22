import ethers from 'ethers';
import { Monopoly } from '../../typechain/Monopoly';
import { MonopolyFactory } from '../../typechain/MonopolyFactory';

const createWallet = () => ({ wallet: ethers.Wallet.createRandom() });

const getWeb3 = () =>
  new Promise(async (resolve, reject) => {
    var results;
    var web3 = window.ethereum;

    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    if (typeof web3 !== 'undefined') {
        // Use Mist/MetaMask's provider.
        web3 = new Web3(web3);

        const accounts = await window.ethereum.enable();

        if (!accounts.length) return reject("Please unlock MetaMask");

        let addr = accounts[0];

        web3.version.getNetwork(async (err, network) => {

            if (err) {
                return reject(err);
            }

            if (network !== '42') {
                return reject("Please switch over to kovan testnet");
            }

            const monopolyContract = MonopolyFactory.connect(CONTRACT_ADDRESS, web3);
            window.monopolyContract = monopolyContract;

            const reg = await getUserInfo(accounts[0]);

            const user = {
                userAddr: addr,
                username: reg[0],
                balance: reg[1].valueOf(),
                gamesPlayed: reg[2].valueOf(),
                finishedGames: reg[3].valueOf(),
                registered: reg[4].valueOf()
            };

            resolve(user);
        });

    } else {
        console.log('No MetaMask - should be handled');
        reject('Please install MetaMask')
    }
});