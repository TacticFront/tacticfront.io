import {Execution, MutableGame, MutablePlayer, PlayerID} from "../game/Game";

export class TargetPlayerExecution implements Execution {

    private requestor: MutablePlayer
    private target: MutablePlayer

    private active = true

    constructor(private requestorID: PlayerID, private targetID: PlayerID) { }


    init(mg: MutableGame, ticks: number): void {
        this.requestor = mg.player(this.requestorID)
        this.target = mg.player(this.targetID)
    }

    tick(ticks: number): void {
        if (this.requestor.canTarget(this.target)) {
            this.requestor.target(this.target)
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