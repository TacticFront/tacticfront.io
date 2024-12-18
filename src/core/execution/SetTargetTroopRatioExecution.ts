import { consolex } from "../Consolex";
import { Execution, MutableGame, MutablePlayer, PlayerID } from "../game/Game";

export class SetTargetTroopRatioExecution implements Execution {

    private player: MutablePlayer

    private active = true

    constructor(private playerID: PlayerID, private targetTroopsRatio: number) { }


    init(mg: MutableGame, ticks: number): void {
        this.player = mg.player(this.playerID)
    }

    tick(ticks: number): void {
        if (this.targetTroopsRatio < 0 || this.targetTroopsRatio > 1) {
            consolex.warn(`target troop ratio of ${this.targetTroopsRatio} for player ${this.player} invalid`)
        } else {
            this.player.setTargetTroopRatio(this.targetTroopsRatio)
        }
        this.active = false
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