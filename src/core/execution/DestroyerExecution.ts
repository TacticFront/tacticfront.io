import { Cell, Execution, MutableGame, MutablePlayer, MutableUnit, PlayerID, Tile, UnitType } from "../game/Game";
import { AStar, PathFinder, PathFindResultType } from "../PathFinding";
import { PseudoRandom } from "../PseudoRandom";
import { distSort, distSortUnit, manhattanDist } from "../Util";

export class DestroyerExecution implements Execution {
    private random: PseudoRandom

    private _owner: MutablePlayer
    private active = true
    private destroyer: MutableUnit = null
    private mg: MutableGame = null

    private target: MutableUnit = null
    private pathfinder = new PathFinder(5000, t => t.isWater())

    private patrolTile: Tile;
    private patrolCenterTile: Tile

    // TODO: put in config
    private searchRange = 100

    constructor(
        private playerID: PlayerID,
        private cell: Cell,
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this._owner = mg.player(this.playerID)
        this.mg = mg
        this.patrolCenterTile = mg.tile(this.cell)
        this.patrolTile = this.patrolCenterTile
        this.random = new PseudoRandom(mg.ticks())
    }

    tick(ticks: number): void {
        if (this.destroyer == null) {
            const spawn = this._owner.canBuild(UnitType.Destroyer, this.patrolTile)
            if (spawn == false) {
                this.active = false
                return
            }
            this.destroyer = this._owner.buildUnit(UnitType.Destroyer, 0, spawn)
            return
        }
        if (!this.destroyer.isActive()) {
            this.active = false
            return
        }
        if (this.target != null && !this.target.isActive()) {
            this.target = null
        }
        if (this.target == null) {
            const ships = this.mg.units(UnitType.TransportShip)
                .filter(u => manhattanDist(u.tile().cell(), this.destroyer.tile().cell()) < 100)
                .filter(u => u.owner() != this.destroyer.owner())
                .filter(u => u != this.destroyer)
                .filter(u => !u.owner().isAlliedWith(this.destroyer.owner()))
            if (ships.length == 0) {
                const result = this.pathfinder.nextTile(this.destroyer.tile(), this.patrolTile)
                switch (result.type) {
                    case PathFindResultType.Completed:
                        this.patrolTile = this.randomTile()
                        break
                    case PathFindResultType.NextTile:
                        this.destroyer.move(result.tile)
                        break
                    case PathFindResultType.Pending:
                        return
                    case PathFindResultType.PathNotFound:
                        console.log(`path not found to patrol tile`)
                        this.patrolTile = this.randomTile()
                        break
                }
                return
            }
            this.target = ships.sort(distSortUnit(this.destroyer))[0]
        }

        for (let i = 0; i < 2; i++) {
            const result = this.pathfinder.nextTile(this.destroyer.tile(), this.target.tile(), 5)
            switch (result.type) {
                case PathFindResultType.Completed:
                    this.target.delete()
                    this.target = null
                    return
                case PathFindResultType.NextTile:
                    this.destroyer.move(result.tile)
                    break
                case PathFindResultType.Pending:
                    break
                case PathFindResultType.PathNotFound:
                    console.log(`path not found to target`)
                    break
            }
        }
    }

    owner(): MutablePlayer {
        return null
    }

    isActive(): boolean {
        return this.active
    }

    activeDuringSpawnPhase(): boolean {
        return false
    }

    randomTile(): Tile {
        while (true) {
            const x = this.patrolCenterTile.cell().x + this.random.nextInt(-this.searchRange / 2, this.searchRange / 2)
            const y = this.patrolCenterTile.cell().y + this.random.nextInt(-this.searchRange / 2, this.searchRange / 2)
            const cell = new Cell(x, y)
            if (!this.mg.isOnMap(cell)) {
                continue
            }
            const tile = this.mg.tile(cell)
            if (!tile.isOcean()) {
                continue
            }
            return tile
        }
    }

}