import { ethers } from "@nomiclabs/buidler";
import fs from 'fs';
import path from 'path';

async function main () {
  const factory = await ethers.getContract("Monopoly")

  // If we had constructor arguments, they would be passed into deploy()
  let contract = await factory.deploy();

  // The address the Contract WILL have once mined
  console.log(contract.address);

  // The transaction that was sent to the network to deploy the Contract
  console.log(contract.deployTransaction.hash);

  // The contract is NOT deployed yet; we must wait until it is mined
  await contract.deployed()

  // console.log(__dirname)

  // Write the address to the config file for use
  await fs.promises.writeFile(path.join(__dirname, '../src/constants/contract.ts'), 'export const CONTRACT_ADDRESS = \'' + contract.address + '\'')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });