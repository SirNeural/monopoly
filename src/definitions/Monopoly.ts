export enum PositionType {
    Start, // Setup game, allocate funds
    Rolling, //
    Moving,
    Action,
    Maintenance,
    NextPlayer,
    Bankrupt,
    End
}

export enum ActionType {
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
export enum MaintainanceType {
    MortgageProperty,
    AddHouse,
    RemoveHouse,
    AddHotel,
    RemoveHotel
    // Trade
}

export interface MonopolyData {
    positionType: PositionType;
    stake: string; // this is contributed by each player. If you win, you get your stake back as well as the stake of the other player. If you lose, you lose your stake.
    currentPlayer: string;
    // moveNum: string;
    numHouses: string; // find max and limit data structure
    numHotels: string; // find max and limit data structure
    blockNum: string;
    // Num houses/hotels
    players: Player[];
}

export interface Player {
    jailed: boolean;
    name: string;
    owner: string;
    balance: string;
    doublesRolled: string;
    position: string;
    propertiesOwned: string[];
}