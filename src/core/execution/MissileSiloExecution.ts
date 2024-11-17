import { BuildValidator } from "../game/BuildValidator";
import { AllPlayers, Cell, Execution, MutableGame, MutablePlayer, MutableUnit, Player, PlayerID, Tile, Unit, UnitType } from "../game/Game";
import { AStar, PathFinder } from "../PathFinding";
import { PseudoRandom } from "../PseudoRandom";
import { bfs, dist, manhattanDist } from "../Util";
import { TradeShipExecution } from "./TradeShipExecution";

export class MissileSiloExecution implements Execution {

    private active = true
    private mg: MutableGame
    private player: MutablePlayer
    private silo: MutableUnit

    constructor(
        private _owner: PlayerID,
        private cell: Cell
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this.mg = mg
        this.player = mg.player(this._owner)
    }

    tick(ticks: number): void {
        if (this.silo == null) {
            const tile = this.mg.tile(this.cell)
            if (!new BuildValidator(this.mg).canBuild(this.player, tile, UnitType.MissileSilo)) {
                console.warn(`player ${this.player} cannot build port at ${this.cell}`)
                this.active = false
                return
            }
            this.silo = this.player.buildUnit(UnitType.MissileSilo, 0, tile)
        }

        if (!this.silo.tile().hasOwner()) {
            this.silo.delete()
            this.active = false
            return
        }
        if (this.silo.tile().owner() != this.silo.owner()) {
            this.silo.setOwner(this.silo.tile().owner() as Player)
            this.player = this.silo.owner()
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