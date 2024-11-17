import { BuildValidator } from "../game/BuildValidator";
import { AllPlayers, Cell, Execution, MutableGame, MutablePlayer, MutableUnit, Player, PlayerID, Tile, Unit, UnitType } from "../game/Game";
import { AStar, PathFinder } from "../PathFinding";
import { PseudoRandom } from "../PseudoRandom";
import { bfs, dist, manhattanDist } from "../Util";

export class TradeShipExecution implements Execution {

    private active = true
    private mg: MutableGame
    private player: MutablePlayer
    private tradeShip: MutableUnit
    private index = 0

    constructor(
        private _owner: PlayerID,
        private srcPort: MutableUnit,
        private dstPort: MutableUnit,
        // don't modify
        private path: Tile[]
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this.mg = mg
        this.player = mg.player(this._owner)
    }

    tick(ticks: number): void {
        if (this.tradeShip == null) {
            this.tradeShip = this.player.buildUnit(UnitType.TradeShip, 0, this.srcPort.tile())
        }
        if (this.index >= this.path.length) {
            this.active = false
            this.tradeShip.delete()
            this.srcPort.owner().addGold(10_000)
            this.dstPort.owner().addGold(10_000)
            return
        }
        this.tradeShip.move(this.path[this.index])
        this.index++
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