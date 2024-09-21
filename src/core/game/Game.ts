import {info} from "console"
import {Config} from "../configuration/Config"
import {GameEvent} from "../EventBus"
import {ClientID, GameID} from "../Schemas"

export type PlayerID = string

export class Cell {

    private strRepr: string

    constructor(
        public readonly x,
        public readonly y
    ) {
        this.strRepr = `Cell[${this.x},${this.y}]`
    }

    toString(): string {return this.strRepr}
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
}

export interface MutableAllianceRequest extends AllianceRequest {
    accept(): void
    reject(): void
}

export interface Alliance {
    requestor(): Player
    recipient(): Player
}

export interface MutableAlliance extends Alliance {

}

export class PlayerInfo {
    constructor(
        public readonly name: string,
        public readonly playerType: PlayerType,
        // null if bot.
        public readonly clientID: ClientID | null,
        public readonly id: PlayerID
    ) { }
}

export interface Tile {
    isLand(): boolean
    isShore(): boolean
    isOceanShore(): boolean
    isWater(): boolean
    isShorelineWater(): boolean
    isOcean(): boolean
    isLake(): boolean
    terrain(): TerrainType
    magnitude(): number
    owner(): Player | TerraNullius
    hasOwner(): boolean
    isBorder(): boolean
    borders(other: Player | TerraNullius): boolean
    isInterior(): boolean
    cell(): Cell
    neighbors(): Tile[]
    neighborsWrapped(): Tile[]
    onShore(): boolean
}

export interface Boat {
    troops(): number
    tile(): Tile
    owner(): Player
    target(): Player | TerraNullius
    isActive(): boolean
}

export interface MutableBoat extends Boat {
    move(tile: Tile): void
    owner(): MutablePlayer
    target(): MutablePlayer | TerraNullius
    setTroops(troops: number): void
    delete(): void
}

export interface TerraNullius {
    ownsTile(cell: Cell): boolean
    isPlayer(): false
    id(): PlayerID // always zero, maybe make it TerraNulliusID?
}

export interface Player {
    info(): PlayerInfo
    name(): string
    clientID(): ClientID
    id(): PlayerID
    type(): PlayerType
    troops(): number
    boats(): Boat[]
    ownsTile(cell: Cell): boolean
    isAlive(): boolean
    borderTiles(): ReadonlySet<Tile>
    isPlayer(): this is Player
    neighbors(): (Player | TerraNullius)[]
    numTilesOwned(): number
    tiles(): ReadonlySet<Tile>
    sharesBorderWith(other: Player | TerraNullius): boolean
    incomingAllianceRequests(): AllianceRequest[]
    outgoingAllianceRequests(): AllianceRequest[]
    alliances(): Alliance[]
    alliedWith(other: Player): boolean
    pendingAllianceRequestWith(other: Player): boolean
    isTraitor(): boolean
    toString(): string
}

export interface MutablePlayer extends Player {
    setName(name: string): void
    setTroops(troops: number): void
    addTroops(troops: number): void
    removeTroops(troops: number): void
    conquer(tile: Tile): void
    relinquish(tile: Tile): void
    executions(): Execution[]
    neighbors(): (MutablePlayer | TerraNullius)[]
    boats(): MutableBoat[]
    incomingAllianceRequests(): MutableAllianceRequest[]
    outgoingAllianceRequests(): MutableAllianceRequest[]
    alliances(): MutableAlliance[]
    breakAllianceWith(other: Player): void
    createAllianceRequest(recipient: Player): MutableAllianceRequest
    addBoat(troops: number, tile: Tile, target: Player | TerraNullius): MutableBoat
}

export interface Game {
    // Throws exception is player not found
    player(id: PlayerID): Player
    playerByClientID(id: ClientID): Player | null
    hasPlayer(id: PlayerID): boolean
    players(): Player[]
    tile(cell: Cell): Tile
    isOnMap(cell: Cell): boolean
    neighbors(cell: Cell | Tile): Tile[]
    width(): number
    height(): number
    numLandTiles(): number
    forEachTile(fn: (tile: Tile) => void): void
    executions(): ExecutionView[]
    terraNullius(): TerraNullius
    executeNextTick(): void
    ticks(): number
    inSpawnPhase(): boolean
    addExecution(...exec: Execution[]): void
    config(): Config
}

export interface MutableGame extends Game {
    player(id: PlayerID): MutablePlayer
    playerByClientID(id: ClientID): MutablePlayer | null
    players(): MutablePlayer[]
    addPlayer(playerInfo: PlayerInfo, troops: number): MutablePlayer
    executions(): Execution[]
}

export class TileEvent implements GameEvent {
    constructor(public readonly tile: Tile) { }
}

export class PlayerEvent implements GameEvent {
    constructor(public readonly player: Player) { }
}

export class BoatEvent implements GameEvent {
    constructor(public readonly boat: Boat, public oldTile: Tile) { }
}

export class AllianceRequestEvent implements GameEvent {
    constructor(public readonly allianceRequest: AllianceRequest) { }
}

export class AllianceRequestReplyEvent implements GameEvent {
    constructor(public readonly allianceRequest: AllianceRequest, public readonly accepted: boolean) { }
}

export class BrokeAllianceEvent implements GameEvent {
    constructor(public readonly traitor: Player, public readonly betrayed: Player) { }
}