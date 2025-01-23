import { EventBus, GameEvent } from "../EventBus"
import { Execution, MutableGame, Player, PlayerID } from "../game/Game"

export class WinEvent implements GameEvent {
    constructor(public readonly winner: Player) { }
}

export class WinCheckExecution implements Execution {

    private active = true

    private mg: MutableGame

    constructor() {
    }

    init(mg: MutableGame, ticks: number) {
        this.mg = mg
    }

    tick(ticks: number) {
        if (ticks % 10 != 0) {
            return
        }
        const sorted = this.mg.players().sort((a, b) => b.numTilesOwned() - a.numTilesOwned())
        if (sorted.length == 0) {
            return
        }
        const max = sorted[0]
        if (max.numTilesOwned() / this.mg.map().numLandTiles() * 100 > this.mg.config().percentageTilesOwnedToWin()) {
            this.mg.setWinner(max)
            this.active = false
        }
    }

    owner(): Player {
        return null
    }

    isActive(): boolean {
        return this.active
    }

    activeDuringSpawnPhase(): boolean {
        return false
    }
}