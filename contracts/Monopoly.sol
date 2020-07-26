pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;

import "@statechannels/nitro-protocol/contracts/interfaces/ForceMoveApp.sol";
import "@statechannels/nitro-protocol/contracts/Outcome.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@nomiclabs/buidler/console.sol";

contract Monopoly is ForceMoveApp {
    using SafeMath for uint256;

    enum PositionType {
        Start, // Setup game, allocate funds
        Rolling, //
        Moving,
        Action,
        Maintenance,
        NextPlayer,
        Bankrupt,
        End
    }

    enum SpaceType {
        Go,
        Property,
        Railroad,
        Utility,
        CommunityChest,
        Chance,
        LuxuryTax,
        IncomeTax,
        Jail,
        FreeParking,
        GoToJail
    }

    enum ActionType {
        PayMoney,
        CollectMoney,
        PayMoneyToAll,
        CollectMoneyFromAll,
        GoToJail,
        GetOutOfJailFree,
        MoveSpaces,
        MoveBackSpaces,
        MoveToSpace,
        MoveToNearestUtility,
        MoveToNearestRailroad,
        PropertyAssessment,
        GeneralRepairs
    }
    enum PropertyStatus {
        Unowned,
        Owned,
        Monopoly,
        SingleHouse,
        DoubleHouse,
        TripleHouse,
        QuadHouse,
        Hotel,
        Mortgaged
    }

    struct Space {
        uint256 id;
        SpaceType spaceType;
        PropertyStatus status;
        uint256[9] prices;
        uint256 housePrice;
        address owner;
    }

    // -1 mortgaged, 0 unowned, 1 owned, 2 monopoly, 3 (1)house, 4 (2) houses, 5 (3) houses, 6 (4) houses, 7 (1) hotel

    struct Turn {
        uint256 player;
        uint256[] purchased;
        uint256[] mortgaged;
        uint256[] unmortgaged;
        uint256[] housesAdded;
        uint256[] housesRemoved;
    }

    struct MonopolyState {
        bytes32 channelId;
        uint256 nonce;
        uint256 currentPlayer;
        uint256 houses; // Do i want to implement this?
        uint256 hotels; // Do i want to implement this?
        Player[] players;
        Space[40] spaces;
        Card[16] chance;
        Card[17] communityChest;
    }

    struct MonopolyData {
        uint256 stake;
        // uint256 blockNum;
        // uint256 moveNum;

        // Num houses/hotels

        PositionType positionType;
        MonopolyState state;
        Turn[] turns;
    }

    struct Card {
        uint256 amount;
        ActionType action;
    }

    struct Player {
        string name;
        address id;
        bool bankrupt;
        uint256 balance;
        uint256 jailed;
        uint256 doublesRolled;
        uint256 position;
        uint256 getOutOfJailFreeCards;
    }

    // Random Instance; 0 - First Dice, 1 - Second Dice, 2 - Community/Chance Cards

    /**
     * @notice Decodes the appData.
     * @dev Decodes the appData.
     * @param appDataBytes The abi.encode of a MonopolyData struct describing the application-specific data.
     * @return An MonopolyData struct containing the application-specific data.
     */
    function appData(bytes memory appDataBytes)
        internal
        pure
        returns (MonopolyData memory)
    {
        return abi.decode(appDataBytes, (MonopolyData));
    }

    /**
     * @notice Encodes the Monopoly update rules.
     * @dev Encodes the Monopoly update rules.
     * @param fromPart State being transitioned from.
     * @param toPart State being transitioned to.
     * @return true if the transition conforms to the rules, false otherwise.
     */
    function validTransition(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        uint256,
        uint256 nParticipants
    ) public override pure returns (bool) {
        // decode application-specific data
        MonopolyData memory fromGameData = appData(fromPart.appData);
        MonopolyData memory toGameData = appData(toPart.appData);

        // deduce action
        if (fromGameData.positionType == PositionType.Start) {
            // Start
            require(
                toGameData.positionType == PositionType.Rolling,
                "Start may only transition to Rolling"
            );
            requireValidStartToRolling(fromGameData, toGameData);
            return true;
        } else if (fromGameData.positionType == PositionType.Rolling) {
            // Rolling,
            if (toGameData.positionType == PositionType.Moving) {
                requireValidRollingToMoving(fromGameData, toGameData);
                return true;
            } else if (toGameData.positionType == PositionType.NextPlayer) {
                requireValidRollingToNextPlayer(fromGameData, toGameData); // Jailed
                return true;
            }
            revert("Rolling may only transition to Moving or NextPlayer");
        } else if (fromGameData.positionType == PositionType.Moving) {
            // Moving,
            require(
                toGameData.positionType == PositionType.Action,
                "Moving may only transition to Action"
            );
            requireValidMovingToAction(fromGameData, toGameData);
            return true;
        } else if (fromGameData.positionType == PositionType.Action) {
            // Action,
            if (toGameData.positionType == PositionType.Rolling) {
                requireValidActionToRolling(fromGameData, toGameData);
                return true;
            } else if (toGameData.positionType == PositionType.Maintenance) {
                requireValidActionToMaintainence(fromGameData, toGameData);
                return true;
            }
            revert("Action may only transition to Rolling or Maintenance");
        } else if (fromGameData.positionType == PositionType.Maintenance) {
            // Maintenance,
            if (toGameData.positionType == PositionType.NextPlayer) {
                requireValidMaintainenceToNextPlayer(fromGameData, toGameData);
                return true;
            } else if (toGameData.positionType == PositionType.Bankrupt) {
                requireValidMaintainenceToBankrupt(fromGameData, toGameData);
                return true;
            }
            revert(
                "Maintainence may only transition to NextPlayer or Bankrupt"
            );
        } else if (fromGameData.positionType == PositionType.NextPlayer) {
            // NextPlayer,
            require(
                toGameData.positionType == PositionType.Rolling,
                "NextPlayer may only transition to Rolling"
            );
            requireValidNextPlayerToRolling(fromGameData, toGameData);
            return true;
        } else if (fromGameData.positionType == PositionType.Bankrupt) {
            // Bankrupt,
            if (toGameData.positionType == PositionType.NextPlayer) {
                requireValidBankruptToNextPlayer(fromGameData, toGameData);
                return true;
            } else if (toGameData.positionType == PositionType.End) {
                requireValidBankruptToEnd(fromGameData, toGameData);
                return true;
            }
            revert("Bankrupt may only transition to NextPlayer or End");
        } else if (fromGameData.positionType == PositionType.End) {
            // End
            // require(
            //     toGameData.positionType == PositionType.Start,
            //     "End may only transition to Start"
            // );
            // requireValidEndToStart(fromGameData, toGameData);
            // return true;
        }
        revert("No valid transition found");
    }

    function getCurrentPlayer(MonopolyState memory fromGameState)
        public
        pure
        returns (Player memory)
    {
        return fromGameState.players[fromGameState.currentPlayer];
    }

    function getRoll(MonopolyState memory fromGameState)
        public
        pure
        returns (uint8[2] memory)
    {
        uint8[2] memory result;
        Player memory currentPlayer = getCurrentPlayer(fromGameState);
        result[0] = rand(
            fromGameState.nonce,
            currentPlayer.id,
            fromGameState.channelId,
            0,
            6
        );
        result[1] = rand(
            fromGameState.nonce,
            currentPlayer.id,
            fromGameState.channelId,
            1,
            6
        );
        return result;
    }

    function getCard(MonopolyState memory fromGameState)
        public
        pure
        returns (Card memory)
    {
        Player memory currentPlayer = getCurrentPlayer(fromGameState);
        bool commChest = fromGameState.spaces[currentPlayer.position]
            .spaceType == SpaceType.CommunityChest;
        uint256 randNum = rand(
            fromGameState.nonce,
            currentPlayer.id,
            fromGameState.channelId,
            2,
            (16 + (commChest ? 1 : 0))
        );
        return
            commChest
                ? fromGameState.communityChest[randNum]
                : fromGameState.chance[randNum];
    }

    function getTurn(MonopolyData memory fromGameData)
        public
        pure
        returns (Turn memory)
    {
        return fromGameData.turns[fromGameData.turns.length - 1];
    }

    function getNextPlayer(MonopolyState memory fromGameState) public pure returns (uint256) {
        uint256 nextPlayer = (fromGameState.currentPlayer + 1) % fromGameState.players.length;
        while (fromGameState.players[nextPlayer].bankrupt) {
            nextPlayer += 1;
        }
        return nextPlayer;
    }

    function copyStruct(MonopolyState memory fromGameState)
        public
        pure
        returns (MonopolyState memory)
    {
        return fromGameState;
    }

    function applyStartToRolling(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.nonce += 1;
        uint8[2] memory roll = getRoll(toGameState);
        if (roll[0] == roll[1]) {
            toGameState.players[toGameState.currentPlayer].doublesRolled += 1;
        }
        return toGameState;
    }

    function requireValidStartToRolling(
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(
            keccak256(abi.encode(toGameData.state)) ==
                keccak256(
                    abi.encode(
                        applyStartToRolling(
                            fromGameData.state,
                            getTurn(fromGameData)
                        )
                    )
                )
        );
    }

    function applyRollingToMoving(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        uint8[2] memory roll = getRoll(fromGameState);
        Player memory fromPlayer = getCurrentPlayer(fromGameState);
        if (roll[0] == roll[1] && fromPlayer.jailed > 0) {
            toGameState.players[fromGameState.currentPlayer].jailed = 0;
        } else {
            require(fromPlayer.jailed == 0);
        }
        uint256 totalMovement = roll[0] + roll[1];
        toGameState.players[fromGameState.currentPlayer].position =
            (fromPlayer.position + totalMovement) %
            40;
        if (
            toGameState.players[fromGameState.currentPlayer].position <
            fromPlayer.position
        ) {
            toGameState.players[fromGameState.currentPlayer].balance += 200;
        }
        return toGameState;
    }

    function requireValidRollingToMoving(
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(
            keccak256(abi.encode(toGameData.state)) ==
                keccak256(
                    abi.encode(
                        applyRollingToMoving(
                            fromGameData.state,
                            getTurn(fromGameData)
                        )
                    )
                )
        );
    }

    function applyRollingToNextPlayer(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        uint8[2] memory roll = getRoll(fromGameState);
        Player memory fromPlayer = getCurrentPlayer(fromGameState);
        require(roll[0] != roll[1]);
        require(fromPlayer.jailed > 0);
        toGameState.players[toGameState.currentPlayer].jailed += 1;
        toGameState.currentPlayer = getNextPlayer(fromGameState);
        return toGameState;
    }

    function requireValidRollingToNextPlayer(
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(
            keccak256(abi.encode(toGameData.state)) ==
                keccak256(
                    abi.encode(
                        applyRollingToNextPlayer(
                            fromGameData.state,
                            getTurn(fromGameData)
                        )
                    )
                )
        );
    }

    function applyCardAction(
        MonopolyState memory fromGameState,
        Turn memory turn,
        Card memory card
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        Player memory player = fromGameState.players[fromGameState
            .currentPlayer];
        Space memory playerSpace = toGameState.spaces[toGameState
            .players[fromGameState.currentPlayer]
            .position];
        if (card.action == ActionType.PayMoney) {
            toGameState.players[fromGameState.currentPlayer].balance -= card
                .amount;
        } else if (card.action == ActionType.CollectMoney) {
            toGameState.players[fromGameState.currentPlayer].balance += card
                .amount;
        } else if (card.action == ActionType.PayMoneyToAll) {
            toGameState.players[fromGameState.currentPlayer].balance -=
                card.amount *
                (fromGameState.players.length - 1);
            for (uint256 i = 0; i < fromGameState.players.length; i++) {
                if (i != fromGameState.currentPlayer) {
                    toGameState.players[i].balance += card.amount;
                }
            }
        } else if (card.action == ActionType.CollectMoneyFromAll) {
            toGameState.players[fromGameState.currentPlayer].balance +=
                card.amount *
                (fromGameState.players.length - 1);
            for (uint256 i = 0; i < fromGameState.players.length; i++) {
                if (i != fromGameState.currentPlayer) {
                    toGameState.players[i].balance -= card.amount;
                }
            }
        } else if (card.action == ActionType.GoToJail) {
            toGameState.players[fromGameState.currentPlayer].position = 10; // Jail
            toGameState.players[fromGameState.currentPlayer].jailed = 1;
        } else if (card.action == ActionType.GetOutOfJailFree) {
            toGameState.players[fromGameState.currentPlayer]
                .getOutOfJailFreeCards += 1;
        } else if (card.action == ActionType.MoveSpaces) {
            toGameState.players[fromGameState.currentPlayer].position =
                (getCurrentPlayer(fromGameState).position + card.amount) %
                40;
            if (
                card.amount > 0 &&
                toGameState.players[fromGameState.currentPlayer].position <
                getCurrentPlayer(fromGameState).position
            ) {
                toGameState.players[fromGameState.currentPlayer].balance += 200;
            }
            if (playerSpace.status == PropertyStatus.Unowned) {
                toGameState.players[fromGameState.currentPlayer]
                    .balance -= playerSpace.prices[0];
                toGameState.spaces[player.position].owner = player.id;
                toGameState.spaces[player.position].status = PropertyStatus
                    .Owned;
            } else if (
                playerSpace.status != PropertyStatus.Mortgaged &&
                playerSpace.owner !=
                fromGameState.players[fromGameState.currentPlayer].id
            ) {
                toGameState.players[fromGameState.currentPlayer]
                    .balance -= playerSpace.prices[uint256(playerSpace.status)];
            }
        } else if (card.action == ActionType.MoveToSpace) {
            toGameState.players[fromGameState.currentPlayer].position = card
                .amount;
            if (
                toGameState.players[fromGameState.currentPlayer].position <
                getCurrentPlayer(fromGameState).position
            ) {
                toGameState.players[fromGameState.currentPlayer].balance += 200;
            }
            if (playerSpace.status == PropertyStatus.Unowned) {
                toGameState.players[fromGameState.currentPlayer]
                    .balance -= playerSpace.prices[0];
                toGameState.spaces[player.position].owner = player.id;
                toGameState.spaces[player.position].status = PropertyStatus
                    .Owned;
            } else if (
                playerSpace.status != PropertyStatus.Mortgaged &&
                playerSpace.owner !=
                fromGameState.players[fromGameState.currentPlayer].id
            ) {
                toGameState.players[fromGameState.currentPlayer]
                    .balance -= playerSpace.prices[uint256(playerSpace.status)];
            }
        } else if (card.action == ActionType.MoveToNearestUtility) {
            if (getCurrentPlayer(fromGameState).position > 28) {
                toGameState.players[fromGameState.currentPlayer].balance += 200;
                toGameState.players[fromGameState.currentPlayer].position = 12;
            } else if (getCurrentPlayer(fromGameState).position > 12) {
                toGameState.players[fromGameState.currentPlayer].position = 28;
            } else if (getCurrentPlayer(fromGameState).position < 12) {
                toGameState.players[fromGameState.currentPlayer].position = 12;
            }
        } else if (card.action == ActionType.MoveToNearestRailroad) {
            if (
                getCurrentPlayer(fromGameState).position > 35 ||
                getCurrentPlayer(fromGameState).position < 5
            ) {
                toGameState.players[fromGameState.currentPlayer].position = 5;
            } else if (getCurrentPlayer(fromGameState).position > 25) {
                toGameState.players[fromGameState.currentPlayer].position = 35;
            } else if (getCurrentPlayer(fromGameState).position > 15) {
                toGameState.players[fromGameState.currentPlayer].position = 25;
            } else if (getCurrentPlayer(fromGameState).position > 5) {
                toGameState.players[fromGameState.currentPlayer].position = 15;
            }
        } else if (card.action == ActionType.PropertyAssessment) {
            // to do
        } else if (card.action == ActionType.GeneralRepairs) {
            // to do
        }
        return toGameState;
    }

    function applyMovingToAction(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        uint8[2] memory roll = getRoll(fromGameState);
        Player memory player = getCurrentPlayer(fromGameState);
        Space memory playerSpace = fromGameState.spaces[player.position];

        if (
            playerSpace.spaceType == SpaceType.CommunityChest ||
            playerSpace.spaceType == SpaceType.Chance
        ) {
            Card memory card = getCard(fromGameState);
            toGameState = applyCardAction(fromGameState, turn, card);
        }

        playerSpace = toGameState.spaces[player.position]; // In case communitychest moves players

        if (playerSpace.spaceType == SpaceType.GoToJail) {
            toGameState.players[fromGameState.currentPlayer].position = 10; // Jail
            toGameState.players[fromGameState.currentPlayer].jailed = 1;
        } else if (playerSpace.spaceType == SpaceType.IncomeTax) {
            toGameState.players[fromGameState.currentPlayer].balance -= 75;
        } else if (playerSpace.spaceType == SpaceType.LuxuryTax) {
            toGameState.players[fromGameState.currentPlayer].balance -= 200;
        } else if (playerSpace.spaceType == SpaceType.FreeParking) {
            // to implement, house rules
        } else if (playerSpace.spaceType == SpaceType.Go) {
            toGameState.players[fromGameState.currentPlayer].balance += 200;
        } else if (
            playerSpace.spaceType == SpaceType.Property ||
            playerSpace.spaceType == SpaceType.Railroad ||
            playerSpace.spaceType == SpaceType.Utility
        ) {
            if (playerSpace.status == PropertyStatus.Unowned) {
                toGameState.players[fromGameState.currentPlayer]
                    .balance -= playerSpace.prices[0];
                toGameState.spaces[player.position].owner = player.id;
                // check for monopolies
            } else if (
                playerSpace.status != PropertyStatus.Mortgaged &&
                playerSpace.owner !=
                fromGameState.players[fromGameState.currentPlayer].id
            ) {
                if (playerSpace.spaceType == SpaceType.Utility) {
                    toGameState.players[fromGameState.currentPlayer].balance -=
                        (roll[0] + roll[1]) *
                        playerSpace.prices[uint256(playerSpace.status)];
                } else {
                    toGameState.players[fromGameState.currentPlayer]
                        .balance -= playerSpace.prices[uint256(
                        playerSpace.status
                    )];
                }
                // check for monopoly here
            }
        }
        return toGameState;
    }

    function requireValidMovingToAction(
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(
            keccak256(abi.encode(toGameData.state)) ==
                keccak256(
                    abi.encode(
                        applyMovingToAction(
                            fromGameData.state,
                            getTurn(fromGameData)
                        )
                    )
                )
        );
    }

    function applyActionToRolling(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.nonce += 1;
        uint8[2] memory toRoll = getRoll(toGameState);
        if (toRoll[0] == toRoll[1]) {
            toGameState.players[fromGameState.currentPlayer].doublesRolled += 1;
            if (
                toGameState.players[fromGameState.currentPlayer]
                    .doublesRolled == 3
            ) {
                toGameState.players[fromGameState.currentPlayer].jailed = 1;
            }
        }

        return toGameState;
    }

    function requireValidActionToRolling(
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(
            keccak256(abi.encode(toGameData.state)) ==
                keccak256(
                    abi.encode(
                        applyActionToRolling(
                            fromGameData.state,
                            getTurn(fromGameData)
                        )
                    )
                )
        );
    }

    function playerOwnsSpace(Space memory space, Player memory player)
        public
        pure
        returns (bool)
    {
        return space.status == PropertyStatus.Owned && space.owner == player.id;
    }


    function applyActionToMaintainence(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        for (uint256 i = 0; i < turn.mortgaged.length; i++) {
            if (
                playerOwnsSpace(
                    fromGameState.spaces[i],
                    getCurrentPlayer(fromGameState)
                )
            ) {
                toGameState.players[fromGameState.currentPlayer]
                    .balance += fromGameState.spaces[i].prices[uint256(
                    PropertyStatus.Mortgaged
                )];
                toGameState.spaces[i].status = PropertyStatus.Mortgaged;
            }
        }
        for (uint256 i = 0; i < turn.unmortgaged.length; i++) {
            if (
                playerOwnsSpace(
                    fromGameState.spaces[i],
                    getCurrentPlayer(fromGameState)
                ) && fromGameState.spaces[i].status == PropertyStatus.Mortgaged
            ) {
                toGameState.players[fromGameState.currentPlayer]
                    .balance -= (fromGameState.spaces[i].prices[uint256(
                    PropertyStatus.Mortgaged
                )] +
                    (fromGameState.spaces[i].prices[uint256(
                        PropertyStatus.Mortgaged
                    )] / 10));
                toGameState.spaces[i].status = PropertyStatus.Owned;
                // check for monopoly here
            }
        }
        for (uint256 i = 0; i < turn.housesAdded.length; i++) {
            if (
                playerOwnsSpace(
                    fromGameState.spaces[i],
                    getCurrentPlayer(fromGameState)
                ) && fromGameState.spaces[i].status == PropertyStatus.Monopoly
            ) {
                toGameState.players[fromGameState.currentPlayer]
                    .balance -= fromGameState.spaces[i].housePrice;
                // check for equal distribution here
            }
        }
        for (uint256 i = 0; i < turn.housesRemoved.length; i++) {
            if (
                playerOwnsSpace(
                    fromGameState.spaces[i],
                    getCurrentPlayer(fromGameState)
                ) && fromGameState.spaces[i].status == PropertyStatus.Monopoly
            ) {
                toGameState.players[fromGameState.currentPlayer].balance +=
                    fromGameState.spaces[i].housePrice /
                    2;
                // check for equal distribution here
            }
        }
    }

    function requireValidActionToMaintainence(
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        // maintainance actions, trades, hotels/houses/etc
        require(
            keccak256(abi.encode(toGameData.state)) ==
                keccak256(
                    abi.encode(
                        applyActionToMaintainence(
                            fromGameData.state,
                            getTurn(fromGameData)
                        )
                    )
                )
        );
    }

    function applyMaintainenceToNextPlayer(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.currentPlayer = getNextPlayer(fromGameState);
        return toGameState;
    }

    function requireValidMaintainenceToNextPlayer(
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(
            keccak256(abi.encode(toGameData.state)) ==
                keccak256(
                    abi.encode(
                        applyMaintainenceToNextPlayer(
                            fromGameData.state,
                            getTurn(fromGameData)
                        )
                    )
                )
        );
    }

    function applyMaintainenceToBankrupt(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.players[toGameState.currentPlayer].bankrupt = true;
        return toGameState;
    }

    function requireValidMaintainenceToBankrupt(
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(
            keccak256(abi.encode(toGameData.state)) ==
                keccak256(
                    abi.encode(
                        applyMaintainenceToBankrupt(
                            fromGameData.state,
                            getTurn(fromGameData)
                        )
                    )
                )
        );
    }

    function applyNextPlayerToRolling(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.nonce += 1;
        uint8[2] memory roll = getRoll(toGameState);
        if (roll[0] == roll[1]) {
            toGameState.players[toGameState.currentPlayer].doublesRolled += 1;
        }
        return toGameState;
    }

    function requireValidNextPlayerToRolling(
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(
            keccak256(abi.encode(toGameData.state)) ==
                keccak256(
                    abi.encode(
                        applyNextPlayerToRolling(
                            fromGameData.state,
                            getTurn(fromGameData)
                        )
                    )
                )
        );
    }

    function applyBankruptToNextPlayer(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.players[toGameState.currentPlayer].bankrupt = true;
        return toGameState;
    }

    function requireValidBankruptToNextPlayer(
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(
            keccak256(abi.encode(toGameData.state)) ==
                keccak256(
                    abi.encode(
                        applyBankruptToNextPlayer(
                            fromGameData.state,
                            getTurn(fromGameData)
                        )
                    )
                )
        );
    }

    function applyBankruptToEnd(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);

        return toGameState;
    }

    function requireValidBankruptToEnd(
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(
            keccak256(abi.encode(toGameData.state)) ==
                keccak256(
                    abi.encode(
                        applyBankruptToEnd(
                            fromGameData.state,
                            getTurn(fromGameData)
                        )
                    )
                )
        );
    }

    function rand(
        uint256 nonce,
        address sender,
        bytes32 channelId,
        uint8 offset,
        uint8 max
    ) public pure returns (uint8) {
        return
            uint8(
                keccak256(
                    abi.encodePacked(nonce + 1, sender, channelId)
                )[offset]
            ) % max;
    }

    modifier outcomeUnchanged(VariablePart memory a, VariablePart memory b) {
        require(
            keccak256(b.outcome) == keccak256(a.outcome),
            "Monopoly: Outcome must not change"
        );
        _;
    }

    modifier stakeUnchanged(
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) {
        require(
            fromGameData.stake == toGameData.stake,
            "The stake should be the same between commitments"
        );
        _;
    }
}
