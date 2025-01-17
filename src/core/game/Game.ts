import { Config } from "../configuration/Config"
import { GameEvent } from "../EventBus"
import { ClientID, GameConfig, GameID } from "../Schemas"
import { GameMap, GameMapImpl, TileRef } from "./GameMap"

export type PlayerID = string
export type Tick = number
export type Gold = number

export const AllPlayers = "AllPlayers" as const;

// export type GameUpdates = Record<GameUpdateType, GameUpdate[]>;
// Create a type that maps GameUpdateType to its corresponding update type
type UpdateTypeMap<T extends GameUpdateType> = Extract<GameUpdate, { type: T }>;

// Then use it to create the record type
export type GameUpdates = {
    [K in GameUpdateType]: UpdateTypeMap<K>[];
}

export interface MapPos {
    x: number
    y: number
}

export enum Difficulty {
    Easy = "Easy",
    Medium = "Medium",
    Hard = "Hard",
    Impossible = "Impossible",
}

export enum GameMapType {
    World = "World",
    Europe = "Europe",
    Mena = "Mena",
    NorthAmerica = "North America",
    Oceania = "Oceania",
    BlackSea = "Black Sea"
}

export enum GameType {
    Singleplayer = "Singleplayer",
    Public = "Public",
    Private = "Private",
}

export interface UnitInfo {
    cost: (player: Player) => Gold
    // Determines if its owner changes when its tile is conquered.
    territoryBound: boolean
    maxHealth?: number,
    damage?: number
}

export enum UnitType {
    TransportShip = "Transport",
    Destroyer = "Destroyer",
    Battleship = "Battleship",
    Shell = "Shell",
    Port = "Port",
    AtomBomb = "Atom Bomb",
    HydrogenBomb = "Hydrogen Bomb",
    TradeShip = "Trade Ship",
    MissileSilo = "Missile Silo",
    DefensePost = "Defense Post",
    City = "City"
}

export enum Relation {
    Hostile = 0,
    Distrustful = 1,
    Neutral = 2,
    Friendly = 3
}

export class Nation {
    constructor(
        public readonly name: string,
        public readonly cell: Cell,
        public readonly strength: number,
    ) { }
}

export class EmojiMessage {
    constructor(
        public readonly sender: Player,
        public readonly recipient: Player | typeof AllPlayers,
        public readonly emoji: string,
        public readonly createdAt: Tick
    ) { }
}

export class Cell {
    public index: number

    private strRepr: string

    constructor(
        public readonly x,
        public readonly y
    ) {
        this.strRepr = `Cell[${this.x},${this.y}]`
    }

    pos(): MapPos {
        return {
            x: this.x,
            y: this.y
        }
    }

    toString(): string { return this.strRepr }
}

export enum TerrainType {
    Plains,
    Highland,
    Mountain,
    Lake,
    Ocean
}

export enum PlayerType {
    Bot = "BOT",
    Human = "HUMAN",
    FakeHuman = "FAKEHUMAN",
}

export interface ExecutionView {
    isActive(): boolean
    // TODO: remove owner
    owner(): Player
    activeDuringSpawnPhase(): boolean
}

export interface Execution extends ExecutionView {
    init(mg: MutableGame, ticks: number): void
    tick(ticks: number): void
    owner(): MutablePlayer
}

export interface AllianceRequest {
    requestor(): Player
    recipient(): Player
    createdAt(): Tick
}

export interface MutableAllianceRequest extends AllianceRequest {
    accept(): void
    reject(): void
    requestor(): MutablePlayer
    recipient(): MutablePlayer
}

export interface Alliance {
    requestor(): Player
    recipient(): Player
    createdAt(): Tick
    other(player: Player): Player
}

export interface MutableAlliance extends Alliance {
    expire(): void
    other(player: Player): MutablePlayer
}

export class PlayerInfo {
    constructor(
        public readonly name: string,
        public readonly playerType: PlayerType,
        // null if bot.
        public readonly clientID: ClientID | null,
        // TODO: make player id the small id
        public readonly id: PlayerID
    ) { }
}

export interface TerrainMap {
    terrain(cell: Cell): TerrainTile
    neighbors(terrainTile: TerrainTile): TerrainTile[]
    width(): number
    height(): number
    isOnMap(cell: Cell): boolean
    numLandTiles(): number
}

export type TerrainTileKey = string



export interface TerrainTile {
    isLand(): boolean
    isShore(): boolean
    isOceanShore(): boolean
    isWater(): boolean
    isShorelineWater(): boolean
    isOcean(): boolean
    isLake(): boolean
    type(): TerrainType
    magnitude(): number
    equals(other: TerrainTile): boolean
    cell(): Cell
    neighbors(): TerrainTile[]
    cost(): number
}

export interface DefenseBonus {
    // Unit providing the defense bonus
    unit: Unit
    amount: number
    tile: Tile
}

export interface Tile {
    owner(): Player | TerraNullius
    hasOwner(): boolean
    isBorder(): boolean
    cell(): Cell
    hasFallout(): boolean
    terrain(): TerrainTile
    neighbors(): Tile[]
    hasDefenseBonus(): boolean
    ref(): TileRef
}

export interface MutableTile extends Tile {
    // defense bonus against this player
    defenseBonus(player: Player): number
    borders(other: Player | TerraNullius): boolean
    neighborsWrapped(): Tile[]
    defenseBonuses(): DefenseBonus[]
    toUpdate(isBorderOnly: boolean): TileUpdate
}

export interface Unit {
    type(): UnitType
    troops(): number
    tile(): Tile
    owner(): Player
    isActive(): boolean
    hasHealth(): boolean
    health(): number
    lastTile(): Tile
}

export interface MutableUnit extends Unit {
    move(tile: Tile): void
    owner(): MutablePlayer
    setTroops(troops: number): void
    info(): UnitInfo
    delete(displayerMessage?: boolean): void
    modifyHealth(delta: number): void
    toUpdate(): UnitUpdate
}

export interface TerraNullius {
    ownsTile(cell: Cell): boolean
    isPlayer(): false
    id(): PlayerID // always zero, maybe make it TerraNulliusID?
    clientID(): ClientID
    smallID(): number
}

export interface Player {
    smallID(): number
    info(): PlayerInfo
    name(): string
    displayName(): string
    clientID(): ClientID
    id(): PlayerID
    type(): PlayerType
    units(...types: UnitType[]): Unit[]
    isAlive(): boolean
    borderTileRefs(): ReadonlySet<TileRef>
    borderTiles(): ReadonlySet<Tile>
    isPlayer(): this is Player
    numTilesOwned(): number
    sharesBorderWith(other: Player | TerraNullius): boolean
    incomingAllianceRequests(): AllianceRequest[]
    outgoingAllianceRequests(): AllianceRequest[]
    alliances(): Alliance[]
    allies(): Player[]
    isAlliedWith(other: Player): boolean
    allianceWith(other: Player): Alliance | null
    // Includes recent requests that  are in cooldown
    // TODO: why can't I have "canSendAllyRequest" function instead?
    recentOrPendingAllianceRequestWith(other: Player): boolean
    // How this player feels about other player.
    relation(other: Player): Relation
    // Sorted from most hated to most liked
    allRelationsSorted(): { player: Player, relation: Relation }[]
    transitiveTargets(): Player[]
    isTraitor(): boolean
    canTarget(other: Player): boolean
    toString(): string
    canSendEmoji(recipient: Player | typeof AllPlayers): boolean
    outgoingEmojis(): EmojiMessage[]
    canDonate(recipient: Player): boolean
    gold(): Gold
    // Population = troops + workers
    population(): number
    workers(): number
    // Number between 0, 1
    targetTroopRatio(): number
    troops(): number

    // If can build returns the spawn tile, false otherwise
    canBuild(type: UnitType, targetTile: Tile): Tile | false
    lastTileChange(): Tick
}

export interface MutablePlayer extends Player {
    // Targets for this player
    targets(): Player[]
    // Targets of player and all allies.
    neighbors(): (Player | TerraNullius)[]
    tiles(): ReadonlySet<MutableTile>
    ownsTile(cell: Cell): boolean
    tiles(): ReadonlySet<Tile>
    conquer(tile: Tile): void
    relinquish(tile: Tile): void
    executions(): Execution[]
    neighbors(): (MutablePlayer | TerraNullius)[]
    units(...types: UnitType[]): MutableUnit[]
    incomingAllianceRequests(): MutableAllianceRequest[]
    outgoingAllianceRequests(): MutableAllianceRequest[]
    alliances(): MutableAlliance[]
    allies(): MutablePlayer[]
    allianceWith(other: Player): MutableAlliance | null
    breakAlliance(alliance: Alliance): void
    createAllianceRequest(recipient: Player): MutableAllianceRequest
    updateRelation(other: Player, delta: number): void
    decayRelations(): void
    target(other: Player): void
    targets(): MutablePlayer[]
    transitiveTargets(): MutablePlayer[]
    sendEmoji(recipient: Player | typeof AllPlayers, emoji: string): void
    donate(recipient: MutablePlayer, troops: number): void

    addGold(toAdd: Gold): void
    removeGold(toRemove: Gold): void

    addWorkers(toAdd: number): void
    removeWorkers(toRemove: number): void
    setTargetTroopRatio(target: number): void
    setTroops(troops: number): void
    addTroops(troops: number): void
    removeTroops(troops: number): number

    buildUnit(type: UnitType, troops: number, tile: Tile): MutableUnit
    captureUnit(unit: MutableUnit): void

    toUpdate(): PlayerUpdate
}

export interface Game extends GameMap {
    // Throws exception is player not found
    player(id: PlayerID): Player
    playerByClientID(id: ClientID): Player | null
    hasPlayer(id: PlayerID): boolean
    players(): Player[]
    tile(cell: Cell): Tile
    isOnMap(cell: Cell): boolean
    width(): number
    height(): number
    forEachTile(fn: (tile: Tile) => void): void
    executions(): ExecutionView[]
    terraNullius(): TerraNullius
    executeNextTick(): GameUpdates
    ticks(): Tick
    inSpawnPhase(): boolean
    addExecution(...exec: Execution[]): void
    nations(): Nation[]
    config(): Config
    displayMessage(message: string, type: MessageType, playerID: PlayerID | null): void
    units(...types: UnitType[]): Unit[]
    unitInfo(type: UnitType): UnitInfo
    playerBySmallID(id: number): Player | TerraNullius
    fromRef(ref: TileRef): Tile
    map(): GameMapImpl
    miniMap(): GameMapImpl
}

export interface MutableGame extends Game {
    tile(cell: Cell): MutableTile
    player(id: PlayerID): MutablePlayer
    playerByClientID(id: ClientID): MutablePlayer | null
    players(): MutablePlayer[]
    allPlayers(): MutablePlayer[]
    addPlayer(playerInfo: PlayerInfo, manpower: number): MutablePlayer
    executions(): Execution[]
    units(...types: UnitType[]): MutableUnit[]
    addTileDefenseBonus(tile: Tile, unit: Unit, amount: number): DefenseBonus
    removeTileDefenseBonus(bonus: DefenseBonus): void
    addFallout(tile: Tile): void
    setWinner(winner: Player): void
}

export enum GameUpdateType {
    Tile,
    Unit,
    Player,
    DisplayEvent,
    AllianceRequest,
    AllianceRequestReply,
    BrokeAlliance,
    AllianceExpired,
    TargetPlayer,
    EmojiUpdate,
    WinUpdate
}

export interface NameViewData {
    x: number,
    y: number,
    size: number,
}

export interface PlayerActions {
    canBoat: boolean
    canAttack: boolean
    buildableUnits: UnitType[]
    interaction?: PlayerInteraction
}

export interface PlayerProfile {
    relations: Record<number, Relation>
    // TODO: add alliances etc
}

export interface PlayerInteraction {
    sharedBorder: boolean
    canSendEmoji: boolean
    canSendAllianceRequest: boolean
    canBreakAlliance: boolean
    canTarget: boolean
    canDonate: boolean
}

export type GameUpdate = TileUpdate
    | UnitUpdate
    | PlayerUpdate
    | AllianceRequestUpdate
    | AllianceRequestReplyUpdate
    | BrokeAllianceUpdate
    | AllianceExpiredUpdate
    | DisplayMessageUpdate
    | TargetPlayerUpdate
    | EmojiUpdate
    | WinUpdate

export interface TileUpdate {
    type: GameUpdateType.Tile
    ownerID: number
    pos: MapPos
    isBorder: boolean
    hasFallout: boolean
    hasDefenseBonus: boolean
}

export interface UnitUpdate {
    type: GameUpdateType.Unit
    unitType: UnitType
    troops: number
    id: number
    ownerID: number
    pos: MapPos
    lastPos: MapPos
    isActive: boolean
    health?: number
}

export interface PlayerUpdate {
    type: GameUpdateType.Player
    nameViewData?: NameViewData,
    clientID: ClientID,
    name: string,
    displayName: string,
    id: PlayerID,
    smallID: number,
    playerType: PlayerType,
    isAlive: boolean,
    tilesOwned: number,
    allies: PlayerID[],
    gold: number,
    population: number,
    workers: number,
    troops: number,
    targetTroopRatio: number
}


export interface AllianceRequestUpdate {
    type: GameUpdateType.AllianceRequest
    requestorID: number,
    recipientID: number,
    createdAt: Tick,
}

export interface AllianceRequestReplyUpdate {
    type: GameUpdateType.AllianceRequestReply
    request: AllianceRequestUpdate
    accepted: boolean
}

export interface BrokeAllianceUpdate {
    type: GameUpdateType.BrokeAlliance
    traitorID: number
    betrayedID: number
}

export interface AllianceExpiredUpdate {
    type: GameUpdateType.AllianceExpired
    player1ID: number
    player2ID: number
}

export interface TargetPlayerUpdate {
    type: GameUpdateType.TargetPlayer
    playerID: number
    targetID: number
}

export interface EmojiUpdate {
    type: GameUpdateType.EmojiUpdate
    message: string
    senderID: number
    recipientID: number | typeof AllPlayers
    createdAt: Tick
}

export interface DisplayMessageUpdate {
    type: GameUpdateType.DisplayEvent
    message: string
    messageType: MessageType
    playerID: number | null
}

export interface WinUpdate {
    type: GameUpdateType.WinUpdate
    winnerID: number,
}

export enum MessageType {
    SUCCESS,
    INFO,
    WARN,
    ERROR
}

