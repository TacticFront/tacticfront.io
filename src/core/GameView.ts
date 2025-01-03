import { MessageType } from "../client/graphics/layers/EventsDisplay";
import { Config } from "./configuration/Config";
import { Alliance, AllianceRequest, AllPlayers, Cell, DefenseBonus, EmojiMessage, Execution, ExecutionView, Game, Gold, MutableTile, Nation, Player, PlayerID, PlayerInfo, PlayerType, Relation, TerrainMap, TerrainTile, TerrainType, TerraNullius, Tick, Tile, Unit, UnitInfo, UnitType } from "./game/Game";
import { ClientID } from "./Schemas";

export interface ViewSerializable<T> {
    toViewData(): ViewData<T>;
}

export interface ViewData<T> {
    // Base view data properties if any
}

export interface TileViewData extends ViewData<TileViewData> {
    x: number
    y: number
    owner: PlayerID,
    hasFallout: boolean
    hasDefenseBonus: boolean
    isBorder: boolean
}

export class TileView implements Tile {
    constructor(private game: Game, private data: TileViewData, private _terrain: TerrainTile) { }
    type(): TerrainType {
        return this._terrain.type()
    }
    owner(): Player | TerraNullius {
        return this.game.player(this.data.owner)
    }
    hasOwner(): boolean {
        return this.data.owner != null
    }
    isBorder(): boolean {
        return this.data.isBorder
    }
    cell(): Cell {
        return new Cell(this.data.x, this.data.y)
    }
    hasFallout(): boolean {
        return this.data.hasFallout
    }
    terrain(): TerrainTile {
        return this._terrain
    }

    neighbors(): Tile[] {
        throw new Error("Method not implemented.");
    }


    hasDefenseBonus(): boolean {
        throw new Error("Method not implemented.");
    }
    cost(): number {
        throw new Error("Method not implemented.");
    }
}

export interface UnitViewData extends ViewData<UnitView> {
    type: UnitType,
    troops: number,
    x: number,
    y: number,
    owner: string,
    isActive: boolean,
    health?: number
}

export class UnitView implements Unit {
    constructor(private data: UnitViewData) { }

    type(): UnitType {
        throw new Error("Method not implemented.");
    }
    troops(): number {
        throw new Error("Method not implemented.");
    }
    tile(): Tile {
        throw new Error("Method not implemented.");
    }
    owner(): Player {
        throw new Error("Method not implemented.");
    }
    isActive(): boolean {
        throw new Error("Method not implemented.");
    }
    hasHealth(): boolean {
        return this.data.health != undefined
    }
    health(): number {
        return this.data.health ?? 0
    }
}

export interface PlayerViewData extends ViewData<PlayerViewData> {
    clientID: ClientID,
    name: string,
    displayName: string,
    id: PlayerID,
    type: PlayerType,
    isAlive: boolean,
    tilesOwned: number,
    allies: PlayerID[],
    gold: number,
    population: number,
    workers: number,
    troops: number,
    targetTroopRatio: number
}

export class PlayerView implements Player {
    constructor(private game: Game, private data: PlayerViewData) { }
    name(): string {
        return this.data.name
    }
    displayName(): string {
        return this.data.displayName
    }
    clientID(): ClientID {
        return this.data.clientID
    }
    id(): PlayerID {
        return this.data.id
    }
    type(): PlayerType {
        return this.data.type
    }
    isAlive(): boolean {
        return this.data.isAlive
    }
    isPlayer(): this is Player {
        return true
    }
    numTilesOwned(): number {
        return this.data.tilesOwned
    }
    allies(): Player[] {
        return this.data.allies.map(a => this.game.player(a))
    }
    gold(): Gold {
        return this.data.gold
    }
    population(): number {
        return this.data.workers
    }
    workers(): number {
        return this.data.workers
    }
    targetTroopRatio(): number {
        return this.data.targetTroopRatio
    }
    troops(): number {
        return
    }

    isAlliedWith(other: Player): boolean {
        return false
    }
    allianceWith(other: Player): Alliance | null {
        return null
    }
    borderTiles(): ReadonlySet<Tile> {
        return new Set()
    }
    units(...types: UnitType[]): Unit[] {
        return []
    }
    sharesBorderWith(other: Player | TerraNullius): boolean {
        return false
    }
    incomingAllianceRequests(): AllianceRequest[] {
        return []
    }
    outgoingAllianceRequests(): AllianceRequest[] {
        return []
    }
    alliances(): Alliance[] {
        return []
    }
    recentOrPendingAllianceRequestWith(other: Player): boolean {
        return false
    }
    relation(other: Player): Relation {
        return Relation.Neutral
    }
    allRelationsSorted(): { player: Player; relation: Relation; }[] {
        return []
    }
    transitiveTargets(): Player[] {
        return []
    }
    isTraitor(): boolean {
        return false
    }
    canTarget(other: Player): boolean {
        return false
    }
    toString(): string {
        return ''
    }
    canSendEmoji(recipient: Player | typeof AllPlayers): boolean {
        return false
    }
    outgoingEmojis(): EmojiMessage[] {
        return []
    }
    canDonate(recipient: Player): boolean {
        return false
    }
    canBuild(type: UnitType, targetTile: Tile): Tile | false {
        return false
    }
    lastTileChange(): Tick {
        return 0
    }
    info(): PlayerInfo {
        return null
    }
}

export interface GameUpdateViewData extends ViewData<GameUpdateViewData> {
    units: UnitViewData[]
    players: PlayerViewData[]
    tileUpdates: TileViewData[]
}

export class GameView implements Game {
    private lastGameUpdate: GameUpdateViewData
    private tiles: TileViewData[][] = []

    constructor(private _terrainMap: TerrainMap) { }
    executions(): ExecutionView[] {
        throw new Error("Method not implemented.");
    }
    executeNextTick(): void {
        throw new Error("Method not implemented.");
    }

    public update(gu: GameUpdateViewData) {
        this.lastGameUpdate = gu
        gu.tileUpdates.forEach(tu => {
            this.tiles[tu.x][tu.y] = tu
        })
    }

    recentlyUpdatedTiles(): TileView[] {
        return this.lastGameUpdate.tileUpdates.map(tu => new TileView(this, tu, this._terrainMap.terrain(new Cell(tu.x, tu.y))))
    }

    player(id: PlayerID): Player {
        throw new Error("Method not implemented.");
    }
    playerByClientID(id: ClientID): Player | null {
        throw new Error("Method not implemented.");
    }
    hasPlayer(id: PlayerID): boolean {
        throw new Error("Method not implemented.");
    }
    players(): Player[] {
        throw new Error("Method not implemented.");
    }
    tile(cell: Cell): Tile {
        throw new Error("Method not implemented.");
    }
    isOnMap(cell: Cell): boolean {
        throw new Error("Method not implemented.");
    }
    neighbors(cell: Cell | Tile): Tile[] {
        throw new Error("Method not implemented.");
    }
    width(): number {
        throw new Error("Method not implemented.");
    }
    height(): number {
        throw new Error("Method not implemented.");
    }
    numLandTiles(): number {
        throw new Error("Method not implemented.");
    }
    forEachTile(fn: (tile: Tile) => void): void {
        throw new Error("Method not implemented.");
    }
    terraNullius(): TerraNullius {
        throw new Error("Method not implemented.");
    }
    ticks(): Tick {
        throw new Error("Method not implemented.");
    }
    inSpawnPhase(): boolean {
        throw new Error("Method not implemented.");
    }
    addExecution(...exec: Execution[]): void {
        throw new Error("Method not implemented.");
    }
    nations(): Nation[] {
        throw new Error("Method not implemented.");
    }
    config(): Config {
        throw new Error("Method not implemented.");
    }
    displayMessage(message: string, type: MessageType, playerID: PlayerID | null): void {
        throw new Error("Method not implemented.");
    }
    units(...types: UnitType[]): Unit[] {
        throw new Error("Method not implemented.");
    }
    unitInfo(type: UnitType): UnitInfo {
        throw new Error("Method not implemented.");
    }
    terrainMap(): TerrainMap {
        throw new Error("Method not implemented.");
    }
    terrainMiniMap(): TerrainMap {
        throw new Error("Method not implemented.");
    }
}