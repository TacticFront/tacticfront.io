import { MessageType, Player, Tile, Unit } from './game/Game';
import { Config } from "./configuration/Config";
import { Alliance, AllianceRequest, AllPlayers, Cell, DefenseBonus, EmojiMessage, Execution, ExecutionView, Game, Gold, MutableTile, Nation, PlayerID, PlayerInfo, PlayerType, Relation, TerrainMap, TerrainTile, TerrainType, TerraNullius, Tick, UnitInfo, UnitType } from "./game/Game";
import { ClientID } from "./Schemas";
import { TerraNulliusImpl } from './game/TerraNulliusImpl';

export interface ViewSerializable<T> {
    toViewData(): T;
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

export class TileView {

    constructor(private game: GameView, private data: TileViewData, private _terrain: TerrainTile) { }

    type(): TerrainType {
        return this._terrain.type()
    }
    owner(): Player | TerraNullius {
        if (!this.hasOwner()) {
            return new TerraNulliusImpl()
        }
        return this.game.player(this.data?.owner)
    }
    hasOwner(): boolean {
        return this.data?.owner != undefined
    }
    isBorder(): boolean {
        return this.data?.isBorder
    }
    cell(): Cell {
        return this._terrain.cell()
    }
    hasFallout(): boolean {
        return this.data?.hasFallout
    }
    terrain(): TerrainTile {
        return this._terrain
    }

    neighbors(): TileView[] {
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

export class UnitView {
    constructor(private data: UnitViewData) { }

    type(): UnitType {
        throw new Error("Method not implemented.");
    }
    troops(): number {
        throw new Error("Method not implemented.");
    }
    tile(): TileView {
        throw new Error("Method not implemented.");
    }
    owner(): PlayerView {
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
    constructor(private game: GameView, private data: PlayerViewData) { }
    lastTileChange(): Tick {
        return 0
    }
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
    info(): PlayerInfo {
        return null
    }
}

export interface GameUpdateViewData extends ViewData<GameUpdateViewData> {
    tick: number
    units: UnitViewData[]
    players: Record<PlayerID, PlayerViewData>
    tileUpdates: TileViewData[]
}

export class GameView {
    private data: GameUpdateViewData
    private tiles: TileViewData[][] = []

    constructor(private _config: Config, private _terrainMap: TerrainMap) {
        this.tiles = Array(_terrainMap.width()).fill(null).map(() => Array(_terrainMap.height()).fill(null));
        this.data = {
            tick: 0,
            units: [],
            tileUpdates: [],
            players: {}
        }
    }

    public update(gu: GameUpdateViewData) {
        this.data = gu
        gu.tileUpdates.forEach(tu => {
            this.tiles[tu.x][tu.y] = tu
        })
    }

    recentlyUpdatedTiles(): TileView[] {
        return this.data.tileUpdates.map(tu => new TileView(this, tu, this._terrainMap.terrain(new Cell(tu.x, tu.y))))
    }

    player(id: PlayerID): Player {
        if (id in this.data.players) {
            return new PlayerView(this, this.data.players[id])
        }
        throw Error(`player id ${id} not found`)
    }
    playerByClientID(id: ClientID): Player | null {
        return null
    }
    hasPlayer(id: PlayerID): boolean {
        return false
    }
    players(): Player[] {
        return []
    }
    tile(cell: Cell): Tile {
        return new TileView(this, this.tiles[cell.x][cell.y], this._terrainMap.terrain(cell))
    }
    isOnMap(cell: Cell): boolean {
        return this._terrainMap.isOnMap(cell)
    }
    width(): number {
        return this._terrainMap.width()
    }
    height(): number {
        return this._terrainMap.height()
    }
    numLandTiles(): number {
        throw new Error("Method not implemented.");
    }
    forEachTile(fn: (tile: Tile) => void): void {
        for (let x = 0; x < this._terrainMap.width(); x++) {
            for (let y = 0; y < this._terrainMap.height(); y++) {
                fn(this.tile(new Cell(x, y)))
            }
        }
    }
    ticks(): Tick {
        return this.data.tick
    }
    inSpawnPhase(): boolean {
        return this.data.tick <= this._config.numSpawnPhaseTurns()
    }
    config(): Config {
        return this._config
    }
    units(...types: UnitType[]): Unit[] {
        return []
    }
    unitInfo(type: UnitType): UnitInfo {
        return this._config.unitInfo(type)
    }
    terrainMap(): TerrainMap {
        return this._terrainMap
    }
}