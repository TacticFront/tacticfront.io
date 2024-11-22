import { MessageType } from "../../client/graphics/layers/EventsDisplay";
import { renderNumber } from "../../client/graphics/Utils";
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
            const spawn = this.player.canBuild(UnitType.TradeShip, this.srcPort.tile())
            if (spawn == false) {
                console.warn(`cannot build trade ship`)
                this.active = false
                return
            }
            this.tradeShip = this.player.buildUnit(UnitType.TradeShip, 0, spawn)
        }
        if (this.index >= this.path.length) {
            this.active = false
            const dist = manhattanDist(this.srcPort.tile().cell(), this.dstPort.tile().cell())
            const gold = dist * 100
            this.srcPort.owner().addGold(gold)
            this.dstPort.owner().addGold(gold)
            this.mg.displayMessage(`Trade ship from ${this.tradeShip.owner().displayName()} has reached your port, giving you ${renderNumber(gold)} gold`, MessageType.SUCCESS, this.dstPort.owner().id())
            this.mg.displayMessage(`Your trade ship reached ${this.dstPort.owner().displayName()}, giving you ${renderNumber(gold)} gold`, MessageType.SUCCESS, this._owner)
            this.tradeShip.delete()
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