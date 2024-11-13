import { Cell, Execution, MutableGame, MutablePlayer, MutableUnit, PlayerID, Tile, UnitType } from "../game/Game";
import { AStar, PathFinder } from "../PathFinding";
import { manhattanDist } from "../Util";

export class DestroyerExecution implements Execution {

    private _owner: MutablePlayer
    private active = true
    private destroyer: MutableUnit = null
    private mg: MutableGame = null

    private target: MutableUnit = null
    private pathfinder = new PathFinder(5000)

    private patrolTile: Tile;

    // TODO: put in config
    private searchRange = 100

    constructor(
        private playerID: PlayerID,
        private cell: Cell,
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this._owner = mg.player(this.playerID)
        this.mg = mg
        this.patrolTile = mg.tile(this.cell)
    }

    tick(ticks: number): void {
        // TODO: remove gold from player
        if (this.destroyer == null) {
            this.destroyer = this._owner.addUnit(UnitType.Destroyer, 0, this.mg.tile(this.cell))
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
                // .filter(u => u.owner() != this.destroyer.owner())
                .filter(u => u != this.destroyer)
                .filter(u => !u.owner().isAlliedWith(this.destroyer.owner()))
            if (ships.length == 0) {
                if (manhattanDist(this.destroyer.tile().cell(), this.cell) > 5) {
                    for (let i = 0; i < 1 + this.mg.ticks() % 2; i++) {
                        const next = this.pathfinder.nextTile(this.destroyer.tile(), this.patrolTile)
                        if (next == null) {
                            this.target = null
                            return
                        }
                        this.destroyer.move(next)
                    }
                }
                return
            }
            // TODO: sort by distance
            this.target = ships[0]
        }
        if (manhattanDist(this.destroyer.tile().cell(), this.target.tile().cell()) < 5) {
            this.target.delete()
            this.target = null
            return
        }
        for (let i = 0; i < 1 + this.mg.ticks() % 2; i++) {
            const next = this.pathfinder.nextTile(this.destroyer.tile(), this.target.tile())
            if (next == null) {
                this.target = null
                console.warn(`target not found`)
                return
            }
            this.destroyer.move(next)
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

}