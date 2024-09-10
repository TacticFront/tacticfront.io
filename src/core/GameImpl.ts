import {info} from "console";
import {Config} from "./configuration/Config";
import {EventBus} from "./EventBus";
import {Cell, Execution, MutableGame, Game, MutablePlayer, PlayerEvent, PlayerID, PlayerInfo, Player, TerraNullius, Tile, TileEvent, Boat, MutableBoat, BoatEvent, TerrainType, PlayerType} from "./Game";
import {ClientID} from "./Schemas";
import {Terrain, TerrainMap} from "./TerrainMapLoader";
import {simpleHash} from "./Util";

export function createGame(terrainMap: TerrainMap, eventBus: EventBus, config: Config): Game {
    return new GameImpl(terrainMap, eventBus, config)
}

type CellString = string

class TileImpl implements Tile {

    public _isBorder = false
    private _neighbors: Tile[] = null

    constructor(
        private readonly gs: GameImpl,
        public _owner: PlayerImpl | TerraNulliusImpl,
        private readonly _cell: Cell,
        private readonly _terrain: Terrain
    ) { }

    neighborsWrapped(): Tile[] {
        const x = this._cell.x;
        const y = this._cell.y;
        const ns: Tile[] = [];

        // Check top neighbor
        if (y > 0) {
            ns.push(this.gs.map[x][y - 1]);
        } else {
            ns.push(this.gs.map[x][this.gs.height() - 1]);
        }

        // Check bottom neighbor
        if (y < this.gs.height() - 1) {
            ns.push(this.gs.map[x][y + 1]);
        } else {
            ns.push(this.gs.map[x][0]);
        }

        // Check left neighbor (wrap around)
        if (x > 0) {
            ns.push(this.gs.map[x - 1][y]);
        } else {
            ns.push(this.gs.map[this.gs.width() - 1][y]);
        }

        // Check right neighbor (wrap around)
        if (x < this.gs.width() - 1) {
            ns.push(this.gs.map[x + 1][y]);
        } else {
            ns.push(this.gs.map[0][y]);
        }
        return ns;
    }
    isLake(): boolean {
        return !this.isLand() && !this.isOcean()
    }
    isOcean(): boolean {
        return this._terrain.ocean
    }
    magnitude(): number {
        return this._terrain.magnitude
    }
    isShore(): boolean {
        return this.isLand() && this._terrain.shoreline
    }
    isOceanShore(): boolean {
        return this.isShore() && this.neighbors().filter(n => n.isOcean()).length > 0
    }
    isShorelineWater(): boolean {
        return this.isWater() && this._terrain.shoreline
    }
    isLand(): boolean {
        return this._terrain.land
    }
    isWater(): boolean {
        return !this._terrain.land
    }
    terrain(): TerrainType {
        return this._terrain.type
    }

    borders(other: Player | TerraNullius): boolean {
        for (const n of this.neighbors()) {
            if (n.owner() == other) {
                return true
            }
        }
        return false
    }

    onShore(): boolean {
        return this.neighbors()
            .filter(t => t.isWater())
            .length > 0
    }

    hasOwner(): boolean {return this._owner != this.gs._terraNullius}
    owner(): MutablePlayer | TerraNullius {return this._owner}
    isBorder(): boolean {return this._isBorder}
    isInterior(): boolean {return this.hasOwner() && !this.isBorder()}
    cell(): Cell {return this._cell}

    neighbors(): Tile[] {
        if (this._neighbors == null) {
            this._neighbors = this.gs.neighbors(this)
        }
        return this._neighbors
    }
}

export class BoatImpl implements MutableBoat {
    private _active = true

    constructor(
        private g: GameImpl,
        private _tile: Tile,
        private _troops: number,
        private _owner: PlayerImpl,
        private _target: PlayerImpl | TerraNulliusImpl
    ) { }

    move(tile: Tile): void {
        const oldTile = this._tile
        this._tile = tile
        this.g.fireBoatUpdateEvent(this, oldTile)
    }
    setTroops(troops: number): void {
        this._troops = troops
    }
    troops(): number {
        return this._troops
    }
    tile(): Tile {
        return this._tile
    }
    owner(): PlayerImpl {
        return this._owner
    }
    target(): PlayerImpl | TerraNullius {
        return this._target
    }
    delete(): void {
        this._owner._boats = this._owner._boats.filter(b => b != this)
        this._active = false
        this.g.fireBoatUpdateEvent(this, this._tile)
    }
    isActive(): boolean {
        return this._active
    }
}

export class PlayerImpl implements MutablePlayer {
    public _borderTiles: Set<Tile> = new Set()

    public _boats: BoatImpl[] = []
    public _tiles: Map<CellString, Tile> = new Map<CellString, Tile>()

    private _name: string

    constructor(private gs: GameImpl, private readonly playerInfo: PlayerInfo, private _troops) {
        this._name = playerInfo.name
    }

    name(): string {
        return this._name
    }

    clientID(): ClientID {
        return this.playerInfo.clientID
    }

    id(): PlayerID {
        return this.playerInfo.id
    }

    type(): PlayerType {
        return this.playerInfo.playerType
    }

    setName(name: string) {

    }

    addBoat(troops: number, tile: Tile, target: Player | TerraNullius): BoatImpl {
        const b = new BoatImpl(this.gs, tile, troops, this, target as PlayerImpl | TerraNulliusImpl)
        this._boats.push(b)
        this.gs.fireBoatUpdateEvent(b, b.tile())
        return b
    }

    boats(): BoatImpl[] {
        return this._boats
    }

    sharesBorderWith(other: Player | TerraNullius): boolean {
        for (const border of this._borderTiles) {
            for (const neighbor of border.neighbors()) {
                if (neighbor.owner() == other) {
                    return true
                }
            }
        }
        return false
    }
    numTilesOwned(): number {
        return this._tiles.size
    }

    tiles(): ReadonlySet<Tile> {
        return new Set(this._tiles.values())
    }

    borderTiles(): ReadonlySet<Tile> {
        return this._borderTiles
    }

    neighbors(): (MutablePlayer | TerraNullius)[] {
        const ns: Set<(MutablePlayer | TerraNullius)> = new Set()
        for (const border of this.borderTiles()) {
            for (const neighbor of border.neighbors()) {
                if (neighbor.isLand() && neighbor.owner() != this) {
                    ns.add((neighbor as TileImpl)._owner)
                }
            }
        }
        return Array.from(ns)
    }

    addTroops(troops: number): void {
        this._troops += Math.floor(troops)
    }
    removeTroops(troops: number): void {
        this._troops -= Math.floor(troops)
        this._troops = Math.max(this._troops, 0)
    }

    isPlayer(): this is MutablePlayer {return true as const}
    ownsTile(cell: Cell): boolean {return this._tiles.has(cell.toString())}
    setTroops(troops: number) {this._troops = Math.floor(troops)}
    conquer(tile: Tile) {this.gs.conquer(this, tile)}
    relinquish(tile: Tile) {
        if (tile.owner() != this) {
            throw new Error(`Cannot relinquish tile not owned by this player`)
        }
        this.gs.relinquish(tile)
    }
    info(): PlayerInfo {return this.playerInfo}
    troops(): number {return this._troops}
    isAlive(): boolean {return this._tiles.size > 0}
    gameState(): MutableGame {return this.gs}
    executions(): Execution[] {
        return this.gs.executions().filter(exec => exec.owner().id() == this.id())
    }
    hash(): number {
        return simpleHash(this.id()) * (this.troops() + this.numTilesOwned())
    }
    toString(): string {
        return `Player:{name:${this.info().name},clientID:${this.info().clientID},isAlive:${this.isAlive()},troops:${this._troops},numTileOwned:${this.numTilesOwned()}}]`
    }
}

class TerraNulliusImpl implements TerraNullius {
    public tiles: Map<Cell, Tile> = new Map<Cell, Tile>()


    constructor(private gs: GameImpl) {
    }

    id(): PlayerID {
        return 'TerraNulliusID'
    }
    ownsTile(cell: Cell): boolean {
        return this.tiles.has(cell)
    }
    isPlayer(): false {return false as const}
}


export class GameImpl implements MutableGame {
    private _ticks = 0

    private unInitExecs: Execution[] = []

    // idCounter: PlayerID = 1; // Zero reserved for TerraNullius
    map: TileImpl[][]
    _players: Map<PlayerID, PlayerImpl> = new Map<PlayerID, PlayerImpl>
    private execs: Execution[] = []
    private _width: number
    private _height: number
    _terraNullius: TerraNulliusImpl

    constructor(terrainMap: TerrainMap, private eventBus: EventBus, private _config: Config) {
        this._terraNullius = new TerraNulliusImpl(this)
        this._width = terrainMap.width();
        this._height = terrainMap.height();
        this.map = new Array(this._width);
        for (let x = 0; x < this._width; x++) {
            this.map[x] = new Array(this._height);
            for (let y = 0; y < this._height; y++) {
                let cell = new Cell(x, y);
                this.map[x][y] = new TileImpl(this, this._terraNullius, cell, terrainMap.terrain(cell));
            }
        }
    }
    hasPlayer(id: PlayerID): boolean {
        return this._players.has(id)
    }
    config(): Config {
        return this._config
    }

    inSpawnPhase(): boolean {
        return this._ticks <= this.config().numSpawnPhaseTurns()
    }

    ticks(): number {
        return this._ticks
    }

    tick() {
        this.execs.forEach(e => {
            if (e.isActive() && (!this.inSpawnPhase() || e.activeDuringSpawnPhase())) {
                e.tick(this._ticks)
            }
        })
        const inited: Execution[] = []
        const unInited: Execution[] = []
        this.unInitExecs.forEach(e => {
            if (!this.inSpawnPhase() || e.activeDuringSpawnPhase()) {
                e.init(this, this._ticks)
                inited.push(e)
            } else {
                unInited.push(e)
            }
        })

        this.removeInactiveExecutions()

        this.execs.push(...inited)
        this.unInitExecs = unInited
        this._ticks++
        if (this._ticks % 100 == 0) {
            let hash = 1;
            this._players.forEach(p => {
                if (p.type() == PlayerType.Human) {
                    console.log(`${p.toString()}`)
                }
                hash += p.hash()
            })
            console.log(`tick ${this._ticks}: hash ${hash}`)
        }
    }

    terraNullius(): TerraNullius {
        return this._terraNullius
    }

    removeInactiveExecutions(): void {
        const activeExecs: Execution[] = []
        for (const exec of this.execs) {
            if (this.inSpawnPhase()) {
                if (exec.activeDuringSpawnPhase()) {
                    if (exec.isActive()) {
                        activeExecs.push(exec)
                    }
                } else {
                    activeExecs.push(exec)
                }
            } else {
                if (exec.isActive()) {
                    activeExecs.push(exec)
                }
            }
        }
        this.execs = activeExecs
    }

    players(): MutablePlayer[] {
        return Array.from(this._players.values()).filter(p => p.isAlive())
    }

    executions(): Execution[] {
        return [...this.execs, ...this.unInitExecs]
    }

    addExecution(...exec: Execution[]) {
        this.unInitExecs.push(...exec)
    }

    removeExecution(exec: Execution) {
        this.execs = this.execs.filter(execution => execution !== exec)
        this.unInitExecs = this.unInitExecs.filter(execution => execution !== exec)
    }

    width(): number {
        return this._width
    }

    height(): number {
        return this._height
    }

    forEachTile(fn: (tile: Tile) => void): void {
        for (let x = 0; x < this._width; x++) {
            for (let y = 0; y < this._height; y++) {
                fn(this.tile(new Cell(x, y)))
            }
        }
    }

    playerView(id: PlayerID): MutablePlayer {
        return this.player(id)
    }

    addPlayer(playerInfo: PlayerInfo, troops: number): MutablePlayer {
        let player = new PlayerImpl(this, playerInfo, troops)
        this._players.set(playerInfo.id, player)
        this.eventBus.emit(new PlayerEvent(player))
        return player
    }

    player(id: PlayerID | null): MutablePlayer {
        if (!this._players.has(id)) {
            throw new Error(`Player with id ${id} not found`)
        }
        return this._players.get(id)
    }

    tile(cell: Cell): Tile {
        this.assertIsOnMap(cell)
        return this.map[cell.x][cell.y]
    }

    isOnMap(cell: Cell): boolean {
        return cell.x >= 0
            && cell.x < this._width
            && cell.y >= 0
            && cell.y < this._height
    }

    neighbors(tile: Tile): Tile[] {
        const x = tile.cell().x
        const y = tile.cell().y
        const ns: TileImpl[] = []
        if (y > 0) {
            ns.push(this.map[x][y - 1])
        }
        if (y < this._height - 1) {
            ns.push(this.map[x][y + 1])
        }
        if (x > 0) {
            ns.push(this.map[x - 1][y])
        }
        if (x < this._width - 1) {
            ns.push(this.map[x + 1][y])
        }
        return ns
    }

    neighborsWithDiag(tile: Tile): Tile[] {
        const x = tile.cell().x
        const y = tile.cell().y
        const ns: TileImpl[] = []
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue // Skip the center tile
                const newX = x + dx
                const newY = y + dy
                if (newX >= 0 && newX < this._width && newY >= 0 && newY < this._height) {
                    ns.push(this.map[newX][newY])
                }
            }
        }
        return ns
    }

    private assertIsOnMap(cell: Cell) {
        if (!this.isOnMap(cell)) {
            throw new Error(`cell ${cell.toString()} is not on map`)
        }
    }

    conquer(owner: PlayerImpl, tile: Tile): void {
        // if (tile.owner() == owner) {
        //     throw new Error(`Player ${owner} already owns cell ${tile.cell().toString()}`)
        // }
        // if (!owner.isPlayer()) {
        //     throw new Error("Must be a player")
        // }
        // if (tile.isWater()) {
        //     throw new Error("Cannot conquer water")
        // }
        const tileImpl = tile as TileImpl
        let previousOwner = tileImpl._owner
        if (previousOwner.isPlayer()) {
            previousOwner._tiles.delete(tile.cell().toString())
            previousOwner._borderTiles.delete(tile)
            tileImpl._isBorder = false
        }
        tileImpl._owner = owner
        owner._tiles.set(tile.cell().toString(), tile)
        this.updateBorders(tile)
        this.eventBus.emit(new TileEvent(tile))
    }

    relinquish(tile: Tile) {
        if (!tile.hasOwner()) {
            throw new Error(`Cannot relinquish tile because it is unowned: cell ${tile.cell().toString()}`)
        }
        if (tile.isWater()) {
            throw new Error("Cannot relinquish water")
        }

        const tileImpl = tile as TileImpl
        let previousOwner = tileImpl._owner as PlayerImpl
        previousOwner._tiles.delete(tile.cell().toString())
        previousOwner._borderTiles.delete(tile)
        tileImpl._isBorder = false

        tileImpl._owner = this._terraNullius
        this.updateBorders(tile)
        this.eventBus.emit(new TileEvent(tile))
    }

    private updateBorders(tile: Tile) {
        const tiles: TileImpl[] = []
        tiles.push(tile as TileImpl)
        tile.neighbors().forEach(t => tiles.push(t as TileImpl))

        for (const t of tiles) {
            if (!t.hasOwner()) {
                t._isBorder = false
                continue
            }
            if (this.isBorder(t)) {
                (t.owner() as PlayerImpl)._borderTiles.add(t);
                t._isBorder = true
            } else {
                (t.owner() as PlayerImpl)._borderTiles.delete(t);
                t._isBorder = false
            }
        }
    }

    isBorder(tile: Tile): boolean {
        if (!tile.hasOwner()) {
            return false
        }
        for (const neighbor of tile.neighbors()) {
            let bordersEnemy = tile.owner() != neighbor.owner()
            if (bordersEnemy) {
                return true
            }
        }
        return false
    }

    public fireBoatUpdateEvent(boat: Boat, oldTile: Tile) {
        this.eventBus.emit(new BoatEvent(boat, oldTile))
    }

}