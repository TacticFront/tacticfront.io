import {EventBus, GameEvent} from "../EventBus"
import {Execution, MutableGame, MutablePlayer, Player, PlayerID} from "../game/Game"

export class WinEvent implements GameEvent {
    constructor(public readonly winner: Player) { }
}

export class WinCheckExecution implements Execution {

    private active = true

    private mg: MutableGame

    constructor(private eventBus: EventBus) {
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
        if (max.numTilesOwned() / this.mg.numLandTiles() * 100 > this.mg.config().percentageTilesOwnedToWin()) {
            this.eventBus.emit(new WinEvent(max))
            this.active = false
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