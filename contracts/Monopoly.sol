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

    struct MonopolyStateEncoded {
        bytes32 channelId;
        uint256 nonce;
        uint256 currentPlayer;
        uint256 houses; // Do i want to implement this?
        uint256 hotels; // Do i want to implement this?
        bytes playersBytes;
        bytes spacesBytes;
        bytes chanceBytes;
        bytes communityChestBytes;
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
        // uint256 blockNum;
        // uint256 moveNum;

        // Num houses/hotels

        PositionType positionType;
        bytes appStateBytes; // MonopolyState
        bytes appTurnBytes; // Turn[]
    }

    struct Card {
        uint256 amount;
        ActionType action;
        string message;
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

    function appState(MonopolyData memory gameData)
        internal
        pure
        returns (MonopolyState memory)
    {
        MonopolyStateEncoded memory temp = abi.decode(gameData.appStateBytes, (MonopolyStateEncoded));
        Player[] memory players = abi.decode(temp.playersBytes, (Player[]));
        Space[40] memory spaces = abi.decode(temp.spacesBytes, (Space[40]));
        Card[16] memory chance = abi.decode(temp.chanceBytes, (Card[16]));
        Card[17] memory communityChest = abi.decode(temp.communityChestBytes, (Card[17]));
        return MonopolyState(temp.channelId, temp.nonce, temp.currentPlayer, temp.houses, temp.hotels, players, spaces, chance, communityChest);
    }

    function appTurns(bytes memory appTurnBytes)
        internal
        pure
        returns (Turn[] memory)
    {
        return abi.decode(appTurnBytes, (Turn[]));
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
        uint48,
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
            require(
                keccak256(toGameData.appStateBytes) ==
                    keccak256(
                        abi.encode(
                            applyStartToRolling(
                                appState(fromGameData),
                                getTurn(fromGameData)
                            )
                        )
                    )
            );
            return true;
        } else if (fromGameData.positionType == PositionType.Rolling) {
            // Rolling,
            if (toGameData.positionType == PositionType.Moving) {
                require(
                    keccak256(toGameData.appStateBytes) ==
                        keccak256(
                            abi.encode(
                                applyRollingToMoving(
                                    appState(fromGameData),
                                    getTurn(fromGameData)
                                )
                            )
                        )
                );
                return true;
            } else if (toGameData.positionType == PositionType.NextPlayer) {
                require(// Jailed
                    keccak256(toGameData.appStateBytes) ==
                        keccak256(
                            abi.encode(
                                applyRollingToNextPlayer(
                                    appState(fromGameData),
                                    getTurn(fromGameData)
                                )
                            )
                        )
                );
                return true;
            }
            revert("Rolling may only transition to Moving or NextPlayer");
        } else if (fromGameData.positionType == PositionType.Moving) {
            // Moving,
            require(
                toGameData.positionType == PositionType.Action,
                "Moving may only transition to Action"
            );
            require(
                keccak256(toGameData.appStateBytes) ==
                    keccak256(
                        abi.encode(
                            applyMovingToAction(
                                appState(fromGameData),
                                getTurn(fromGameData)
                            )
                        )
                    )
            );
            return true;
        } else if (fromGameData.positionType == PositionType.Action) {
            // Action,
            if (toGameData.positionType == PositionType.Rolling) {
                require(
                    keccak256(toGameData.appStateBytes) ==
                        keccak256(
                            abi.encode(
                                applyActionToRolling(
                                    appState(fromGameData),
                                    getTurn(fromGameData)
                                )
                            )
                        )
                );
                return true;
            } else if (toGameData.positionType == PositionType.Maintenance) {
                require(
                    keccak256(toGameData.appStateBytes) ==
                        keccak256(
                            abi.encode(
                                applyActionToMaintainence(
                                    appState(fromGameData),
                                    getTurn(fromGameData)
                                )
                            )
                        )
                );
                return true;
            }
            revert("Action may only transition to Rolling or Maintenance");
        } else if (fromGameData.positionType == PositionType.Maintenance) {
            // Maintenance,
            if (toGameData.positionType == PositionType.NextPlayer) {
                require(
                    keccak256(toGameData.appStateBytes) ==
                        keccak256(
                            abi.encode(
                                applyMaintainenceToNextPlayer(
                                    appState(fromGameData),
                                    getTurn(fromGameData)
                                )
                            )
                        )
                );
                return true;
            } else if (toGameData.positionType == PositionType.Bankrupt) {
                require(
                    keccak256(toGameData.appStateBytes) ==
                        keccak256(
                            abi.encode(
                                applyMaintainenceToBankrupt(
                                    appState(fromGameData),
                                    getTurn(fromGameData)
                                )
                            )
                        )
                );
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
            require(
                    keccak256(toGameData.appStateBytes) ==
                        keccak256(
                            abi.encode(
                                applyNextPlayerToRolling(
                                    appState(fromGameData),
                                    getTurn(fromGameData)
                                )
                            )
                        )
                );
            return true;
        } else if (fromGameData.positionType == PositionType.Bankrupt) {
            // Bankrupt,
            if (toGameData.positionType == PositionType.NextPlayer) {
                require(
                    keccak256(toGameData.appStateBytes) ==
                        keccak256(
                            abi.encode(
                                applyBankruptToNextPlayer(
                                    appState(fromGameData),
                                    getTurn(fromGameData)
                                )
                            )
                        )
                );
                return true;
            } else if (toGameData.positionType == PositionType.End) {
                require(
                    keccak256(toGameData.appStateBytes) ==
                        keccak256(
                            abi.encode(
                                applyBankruptToEnd(
                                    appState(fromGameData),
                                    getTurn(fromGameData)
                                )
                            )
                        )
                );
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
        Turn[] memory temp = appTurns(fromGameData.appTurnBytes);
        return temp[temp.length - 1];
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

    function applyMaintainenceToNextPlayer(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.currentPlayer = getNextPlayer(fromGameState);
        return toGameState;
    }

    function applyMaintainenceToBankrupt(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.players[toGameState.currentPlayer].bankrupt = true;
        return toGameState;
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

    function applyBankruptToNextPlayer(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.players[toGameState.currentPlayer].bankrupt = true;
        return toGameState;
    }

    function applyBankruptToEnd(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);

        return toGameState;
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
}
