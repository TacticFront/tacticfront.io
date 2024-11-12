import { Cell, Execution, MutableGame, MutablePlayer, MutableUnit, PlayerID, Tile, UnitType } from "../game/Game";
import { AStar, PathFinder } from "../PathFinding";
import { manhattanDist } from "../Util";

export class DestroyerExecution implements Execution {

    private _owner: MutablePlayer
    private active = true
    private destroyer: MutableUnit = null
    private mg: MutableGame = null

    private target: MutableUnit = null
    private pathfinder = new PathFinder()

    // TODO: put in config
    private searchRange = 100

    constructor(
        private playerID: PlayerID,
        private cell: Cell,
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this._owner = mg.player(this.playerID)
        this.mg = mg
    }

    tick(ticks: number): void {
        if (this.destroyer == null) {
            this.destroyer = this._owner.addUnit(UnitType.Destroyer, 0, this.mg.tile(this.cell))
            return
        }
        if (!this.destroyer.isActive()) {
            this.active = false
            return
        }
        if (this.target == null) {
            const ships = this.mg.units(UnitType.TransportShip)
                .filter(u => manhattanDist(u.tile().cell(), this.destroyer.tile().cell()))
                .filter(u => u.owner() != this.destroyer.owner())
                .filter(u => !u.owner().isAlliedWith(this.destroyer.owner()))
            if (ships.length == 0) {
                return
            }
            // TODO: sort by distance
            this.target = ships[0]
        }
        const next = this.pathfinder.nextTile(this.destroyer.tile(), this.target.tile())
        if (next == null) {
            this.target = null
            return
        }

        this.destroyer.move(next)
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