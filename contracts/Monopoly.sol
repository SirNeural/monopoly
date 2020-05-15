pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;

import "@statechannels/nitro-protocol/contracts/interfaces/ForceMoveApp.sol";
import "@statechannels/nitro-protocol/contracts/Outcome.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@nomiclabs/buidler/console.sol";
import "./PRNG.sol";

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

    enum ActionType {
        BuyProperty,
        AuctionProperty,
        PayRent,
        PayUtilities,
        PayIncomeTax,
        PayLuxuryTax,
        GoToJail,
        CommunityCard,
        ChanceCard,
        FreeParking
        //Pass Go?
    }
    enum MaintainanceType {
        MortgageProperty,
        AddHouse,
        RemoveHouse,
        AddHotel,
        RemoveHotel
        // Trade
    }

    enum SpaceType {
        Corner,
        Property,
        Railroad,
        Utility,
        Card,
        Tax
    }
    enum CardActionType {
        PayMoney,
        CollectMoney,
        PayMoneyToAll,
        CollectMoneyFromAll,
        CollectMoneyFromBank,
        GoToJail,
        GetOutOfJailFree,
        MoveSpaces,
        MoveToSpace
    }

    struct Space {
        SpaceType spaceType;
        uint8[] prices;
        address owner;
        CardActionType action;
    }

    struct MonopolyData {
        PositionType positionType;
        uint256 stake; // this is contributed by each player. If you win, you get your stake back as well as the stake of the other player. If you lose, you lose your stake.
        // uint256 blockNum;
        // uint256 moveNum;
        uint8 currentPlayer;
        uint8 houses; // find max and limit data structure
        uint8 hotels; // find max and limit data structure
        // Num houses/hotels
        Player[] players;
        Space[40] spaces;
    }

    struct Player {
        string name;
        address id;
        bool jailed;
        uint32 balance;
        uint8 doublesRolled;
        uint8 position;
        uint8 getOutOfJailFreeCards;
        int8[] properties;
        // -1 mortgaged, 0 unowned, 1 owned, 2 monopoly, 3 (1)house, 4 (2) houses, 5 (3) houses, 6 (4) houses, 7 (1) hotel
    }

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
        uint256 turnNumB,
        uint256 nParticipants
    ) public pure override returns (bool) {
        Outcome.AllocationItem[] memory fromAllocation = extractAllocation(
            fromPart,
            nParticipants
        );
        Outcome.AllocationItem[] memory toAllocation = extractAllocation(
            toPart,
            nParticipants
        );
        _requireDestinationsUnchanged(
            fromAllocation,
            toAllocation,
            nParticipants
        );
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
            requireValidStartToRolling(
                fromAllocation,
                toAllocation,
                fromGameData,
                toGameData
            );
            return true;
        } else if (fromGameData.positionType == PositionType.Rolling) {
            // Rolling,
            if (toGameData.positionType == PositionType.Moving) {
                requireValidRollingToMoving(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            } else if (toGameData.positionType == PositionType.NextPlayer) {
                requireValidRollingToNextPlayer( // Jailed
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
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
            requireValidMovingToAction(
                fromAllocation,
                toAllocation,
                fromGameData,
                toGameData
            );
            return true;
        } else if (fromGameData.positionType == PositionType.Action) {
            // Action,
            if (toGameData.positionType == PositionType.Rolling) {
                requireValidActionToRolling(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            } else if (toGameData.positionType == PositionType.Maintenance) {
                requireValidActionToMaintainence(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            }
            revert("Action may only transition to Rolling or Maintenance");
        } else if (fromGameData.positionType == PositionType.Maintenance) {
            // Maintenance,
            if (toGameData.positionType == PositionType.NextPlayer) {
                requireValidMaintainenceToNextPlayer(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            } else if (toGameData.positionType == PositionType.Bankrupt) {
                requireValidMaintainenceToBankrupt(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
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
            requireValidNextPlayerToRolling(
                fromAllocation,
                toAllocation,
                fromGameData,
                toGameData
            );
            return true;
        } else if (fromGameData.positionType == PositionType.Bankrupt) {
            // Bankrupt,
            if (toGameData.positionType == PositionType.NextPlayer) {
                requireValidBankruptToNextPlayer(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            } else if (toGameData.positionType == PositionType.End) {
                requireValidBankruptToEnd(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            }
            revert("Bankrupt may only transition to NextPlayer or End");
        } else if (fromGameData.positionType == PositionType.End) {
            // End
            require(
                toGameData.positionType == PositionType.Start,
                "End may only transition to Start"
            );
            requireValidEndToStart(
                fromAllocation,
                toAllocation,
                fromGameData,
                toGameData
            );
            return true;
        }
        revert("No valid transition found");
    }

    function requireValidStartToRolling(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {}

    function requireValidRollingToMoving(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {}

    function requireValidRollingToNextPlayer(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {}

    function requireValidMovingToAction(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {}

    function requireValidActionToRolling(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {}

    function requireValidActionToMaintainence(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {}

    function requireValidMaintainenceToNextPlayer(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {}

    function requireValidMaintainenceToBankrupt(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {}

    function requireValidNextPlayerToRolling(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {}

    function requireValidBankruptToNextPlayer(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {}

    function requireValidBankruptToEnd(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {}

    function requireValidEndToStart(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {}

    function _requireDestinationsUnchanged(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        uint256 nParticipants
    ) private pure {
        for (uint256 i = 0; i < nParticipants; i++) {
            require(
                toAllocation[i].destination == fromAllocation[i].destination,
                string(
                    abi.encodePacked(
                        "RockPaperScissors: Destimation player ",
                        i,
                        " may not change"
                    )
                )
            );
        }
    }

    function extractAllocation(
        VariablePart memory variablePart,
        uint256 nParticipants
    ) private pure returns (Outcome.AllocationItem[] memory) {
        Outcome.OutcomeItem[] memory outcome = abi.decode(
            variablePart.outcome,
            (Outcome.OutcomeItem[])
        );
        require(outcome.length == 1, "Monopoly: Only one asset allowed");

        Outcome.AssetOutcome memory assetOutcome = abi.decode(
            outcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );

        require(
            assetOutcome.assetOutcomeType ==
                uint8(Outcome.AssetOutcomeType.Allocation),
            "Monopoly: AssetOutcomeType must be Allocation"
        );

        Outcome.AllocationItem[] memory allocation = abi.decode(
            assetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );

        require(
            allocation.length == nParticipants,
            "Monopoly: Allocation length must equal number of participants"
        );

        return allocation;
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

    modifier allocationsNotLessThanStake(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        MonopolyData memory fromGameData,
        MonopolyData memory toGameData,
        uint256 nParticipants
    ) {
        for (uint256 i = 0; i < nParticipants; i++) {
            require(
                fromAllocation[i].amount >= toGameData.stake,
                string(
                    abi.encodePacked(
                        "The allocation for player ",
                        i,
                        " must not fall below the stake"
                    )
                )
            );
        }
        _;
    }

    modifier allocationUnchanged(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        uint256 nParticipants
    ) {
        for (uint256 i = 0; i < nParticipants; i++) {
            require(
                toAllocation[i].destination == fromAllocation[i].destination,
                string(
                    abi.encodePacked(
                        "Monopoly: Destination for player ",
                        i,
                        " may not change"
                    )
                )
            );
            require(
                toAllocation[i].amount == fromAllocation[i].amount,
                string(
                    abi.encodePacked(
                        "Monopoly: Amount for player ",
                        i,
                        " may not change"
                    )
                )
            );
        }
        _;
    }
}
