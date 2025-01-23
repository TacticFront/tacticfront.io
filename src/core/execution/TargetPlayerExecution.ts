import { Execution, MutableGame, Player, PlayerID } from "../game/Game";

export class TargetPlayerExecution implements Execution {

    private requestor: Player
    private target: Player

    private active = true

    constructor(private requestorID: PlayerID, private targetID: PlayerID) { }


    init(mg: MutableGame, ticks: number): void {
        this.requestor = mg.player(this.requestorID)
        this.target = mg.player(this.targetID)
    }

    tick(ticks: number): void {
        if (this.requestor.canTarget(this.target)) {
            this.requestor.target(this.target)
            this.target.updateRelation(this.requestor, -40)
        }
        this.active = false
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