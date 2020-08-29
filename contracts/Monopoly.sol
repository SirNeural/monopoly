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
        string name;
        string color;
        SpaceType spaceType;
        PropertyStatus status;
        uint8 id;
        uint256[9] prices;
        uint256 housePrice;
        address owner;
    }

    // -1 mortgaged, 0 unowned, 1 owned, 2 monopoly, 3 (1)house, 4 (2) houses, 5 (3) houses, 6 (4) houses, 7 (1) hotel

    struct Turn {
        uint256 player;
        uint8[] purchased;
        uint8[] mortgaged;
        uint8[] unmortgaged;
        uint8[] housesAdded;
        uint8[] housesRemoved;
    }

    struct MonopolyStateEncoded {
        bytes32 channelId;
        uint256 nonce;
        uint256 currentPlayer;
        uint256 taxes;
        PositionType positionType;
        uint8 houses;
        uint8 hotels;
        bytes playersBytes;
        bytes spacesBytes;
        bytes chanceBytes;
        bytes communityChestBytes;
    }

    struct MonopolyState {
        bytes32 channelId;
        uint256 nonce;
        uint256 currentPlayer;
        uint256 taxes;
        PositionType positionType;
        uint8 houses;
        uint8 hotels;
        Player[] players;
        Space[40] spaces;
        Card[16] chance;
        Card[17] communityChest;
    }

    struct MonopolyData {
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
        string avatar;
        address id;
        bool bankrupt;
        uint256 balance;
        uint8 jailed;
        uint8 doublesRolled;
        uint8 position;
        uint8 getOutOfJailFreeCards;
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
        return MonopolyState(temp.channelId, temp.nonce, temp.currentPlayer, temp.taxes, temp.positionType, temp.houses, temp.hotels, players, spaces, chance, communityChest);
    }

    function appTurns(bytes memory appTurnBytes)
        internal
        pure
        returns (Turn[] memory)
    {
        return abi.decode(appTurnBytes, (Turn[]));
    }

    function numActivePlayers(Player[] memory players) public pure returns (uint8) {
        uint8 result = 0;
        for(uint256 i = 0; i < players.length; i++) {
            if(!players[i].bankrupt)
                result += 1;
        }
        return result;
    }

    function nextState(
        MonopolyData memory fromGameData,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory fromGameState = appState(fromGameData);
        if(fromGameState.positionType == PositionType.Start) {
            return Rolling(fromGameState, turn);
        } else if(fromGameState.positionType == PositionType.Rolling) {
            if(fromGameState.players[fromGameState.currentPlayer].jailed == 0) {
                return Moving(fromGameState, turn);
            } else {
                return NextPlayer(fromGameState, turn);
            }
        } else if(fromGameState.positionType == PositionType.Moving) {
            return Action(fromGameState, turn);
        } else if(fromGameState.positionType == PositionType.Action) {
            uint8[2] memory roll = getRoll(fromGameState);
            if(roll[0] == roll[1]) {
                return Rolling(fromGameState, turn);
            } else {
                return Maintenance(fromGameState, turn);
            }
        } else if(fromGameState.positionType == PositionType.Maintenance) {
            if (fromGameState.players[fromGameState.currentPlayer].balance < 0) {
                return Bankrupt(fromGameState, turn);
            } else {
                return NextPlayer(fromGameState, turn);
            }
        } else if(fromGameState.positionType == PositionType.Bankrupt) {
            if(numActivePlayers(fromGameState.players) <= 1) {
                return End(fromGameState, turn);
            } else {
                return NextPlayer(fromGameState, turn);
            }
        } else if(fromGameState.positionType == PositionType.NextPlayer) {
            return Rolling(fromGameState, turn);
        } else {
            return fromGameState;
        }
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

        if(appState(fromGameData).positionType == PositionType.End) {
            return false;
        }
        MonopolyState memory tempGameState;
        do {
            tempGameState = nextState(fromGameData, getTurn(fromGameData));
        } while (tempGameState.positionType != PositionType.NextPlayer);
        require(keccak256(toGameData.appStateBytes) == keccak256(abi.encode(tempGameState)));
        return true;
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
        ) + 1;
        result[1] = rand(
            fromGameState.nonce,
            currentPlayer.id,
            fromGameState.channelId,
            1,
            6
        ) + 1;
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
        uint8 randNum = rand(
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

    function getUtilitiesOwnedByPlayer(
        MonopolyState memory fromGameState, 
        address owner
    ) public pure returns (uint8) {
        uint8 count = 0;
        for(uint i = 0; i < fromGameState.spaces.length; i++) {
            if(fromGameState.spaces[i].owner == owner && fromGameState.spaces[i].spaceType == SpaceType.Utility) {
                count++;
            }
        }
        return count;
    }
    function getRailroadsOwnedByPlayer(
        MonopolyState memory fromGameState, 
        address owner
    ) public pure returns (uint8) {
        uint8 count = 0;
        for(uint i = 0; i < fromGameState.spaces.length; i++) {
            if(fromGameState.spaces[i].owner == owner && fromGameState.spaces[i].spaceType == SpaceType.Railroad) {
                count++;
            }
        }
        return count;
    }
    function spacePartOfMonopoly(
        MonopolyState memory fromGameState,
        Space memory space
    ) public pure returns (bool) {
        for(uint i = 0; i < fromGameState.spaces.length; i++) {
            if(keccak256(bytes(fromGameState.spaces[i].color)) == keccak256(bytes(space.color))) {
                if(fromGameState.spaces[i].owner != space.owner) return false;
            }
        }
        return true;
    }

    function Start(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.positionType = PositionType.Start;
        return toGameState;
    }

    function Rolling(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.positionType = PositionType.Rolling;
        toGameState.nonce += 1;
        uint8[2] memory roll = getRoll(toGameState);
        if (roll[0] == roll[1]) {
            toGameState.players[toGameState.currentPlayer].doublesRolled += 1;
            if(toGameState.players[fromGameState.currentPlayer].doublesRolled == 3)
                toGameState.players[fromGameState.currentPlayer].jailed = 1;
        }
        return toGameState;
    }

    function Moving(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.positionType = PositionType.Moving;
        uint8[2] memory roll = getRoll(fromGameState);
        Player memory fromPlayer = getCurrentPlayer(fromGameState);
        if (roll[0] == roll[1] && fromPlayer.jailed > 0) {
            toGameState.players[fromGameState.currentPlayer].jailed = 0;
        } else {
            require(fromPlayer.jailed == 0);
        }
        uint8 totalMovement = roll[0] + roll[1];
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

    function NextPlayer(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.positionType = PositionType.NextPlayer;
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
                (getCurrentPlayer(fromGameState).position + uint8(card.amount)) %
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
                    .balance -= playerSpace.prices[uint8(playerSpace.status)];
            }
        } else if (card.action == ActionType.MoveBackSpaces) {
            toGameState.players[fromGameState.currentPlayer].position =
                (getCurrentPlayer(fromGameState).position - uint8(card.amount)) %
                40;
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
                    .balance -= playerSpace.prices[uint8(playerSpace.status)];
            }
        } else if (card.action == ActionType.MoveToSpace) {
            toGameState.players[fromGameState.currentPlayer].position = uint8(card
                .amount);
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
                    .balance -= playerSpace.prices[uint8(playerSpace.status)];
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

    function arrayContains(
        uint8[] memory array,
        uint8 value
    ) public pure returns (bool) {
        for(uint i = 0; i < array.length; i++) {
            if(array[i] == value) return true;
        }
        return false;
    }

    function Action(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.positionType = PositionType.Action;
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
            toGameState.taxes += 75;
        } else if (playerSpace.spaceType == SpaceType.LuxuryTax) {
            toGameState.players[fromGameState.currentPlayer].balance -= 200;
            toGameState.taxes += 75;
        } else if (playerSpace.spaceType == SpaceType.FreeParking) {
            toGameState.players[fromGameState.currentPlayer].balance += toGameState.taxes;
            toGameState.taxes = 0;
        } else if (playerSpace.spaceType == SpaceType.Go) {
            toGameState.players[fromGameState.currentPlayer].balance += 200;
        } else if (
            playerSpace.spaceType == SpaceType.Property ||
            playerSpace.spaceType == SpaceType.Railroad ||
            playerSpace.spaceType == SpaceType.Utility
        ) {
            if (playerSpace.status == PropertyStatus.Unowned && arrayContains(turn.purchased, playerSpace.id)) {
                uint256 price;
                if(playerSpace.spaceType == SpaceType.Railroad) {
                    price = 200;
                } else if (playerSpace.spaceType == SpaceType.Utility) {
                    price = 150;
                } else {
                    price = playerSpace.prices[0];
                }
                toGameState.players[fromGameState.currentPlayer]
                    .balance -= price;
                toGameState.spaces[player.position].owner = player.id;
                toGameState.spaces[player.position].status == PropertyStatus.Owned;
                bool monopoly = spacePartOfMonopoly(toGameState, toGameState.spaces[player.position]);
                if(monopoly) {
                    for(uint i = 0; i < toGameState.spaces.length; i++) {
                        if(keccak256(bytes(toGameState.spaces[i].color)) == keccak256(bytes(toGameState.spaces[player.position].color))) {
                            toGameState.spaces[i].status == PropertyStatus.Monopoly;
                        }
                    }
                }
            } else if (
                playerSpace.status != PropertyStatus.Mortgaged &&
                playerSpace.owner !=
                fromGameState.players[fromGameState.currentPlayer].id
            ) {
                if (playerSpace.spaceType == SpaceType.Utility) {
                    uint8 utilitiesOwned = getUtilitiesOwnedByPlayer(fromGameState, playerSpace.owner);
                    require(utilitiesOwned > 0);
                    toGameState.players[fromGameState.currentPlayer].balance -=
                        (roll[0] + roll[1]) * (utilitiesOwned > 1 ? 10 : 4);
                    
                } else if (playerSpace.spaceType == SpaceType.Railroad) {
                    uint8 railroadsOwned = getRailroadsOwnedByPlayer(fromGameState, playerSpace.owner);
                    require(railroadsOwned > 0);
                    toGameState.players[fromGameState.currentPlayer].balance -= 25 * (2**uint256(railroadsOwned - 1));
                } else {
                    toGameState.players[fromGameState.currentPlayer]
                        .balance -= playerSpace.prices[uint8(
                        playerSpace.status
                    )];
                }
                // check for monopoly here
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


    function Maintenance(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.positionType = PositionType.Maintenance;
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

    function Bankrupt(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.positionType = PositionType.Bankrupt;
        toGameState.players[toGameState.currentPlayer].bankrupt = true;
        return toGameState;
    }

    function End(
        MonopolyState memory fromGameState,
        Turn memory turn
    ) public pure returns (MonopolyState memory) {
        MonopolyState memory toGameState = copyStruct(fromGameState);
        toGameState.positionType = PositionType.End;
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
                    abi.encode(nonce, sender, channelId)
                )[offset]
            ) % max;
    }
}
