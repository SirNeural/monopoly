pragma solidity ^0.6.2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@nomiclabs/buidler/console.sol";


contract PRNG {
    using SafeMath for uint256;
    uint256 nonce = 0;

    constructor(uint256 _nonce) public {
        nonce = _nonce;
    }

    function rand() public returns (uint256) {
        nonce += 1;
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        nonce,
                        msg.sender,
                        blockhash(block.number - 1)
                    )
                )
            );
    }
}
