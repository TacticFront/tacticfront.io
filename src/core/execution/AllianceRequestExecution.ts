import {AllianceRequest, Execution, MutableGame, MutablePlayer, Player, PlayerID} from "../game/Game";

export class AllianceRequestExecution implements Execution {
    private active = true
    private mg: MutableGame = null
    private requestor: Player;
    private recipient: Player

    constructor(private requestorID: PlayerID, private recipientID: PlayerID) { }

    init(mg: MutableGame, ticks: number): void {
        this.mg = mg
        this.requestor = mg.player(this.requestorID)
        this.recipient = mg.player(this.recipientID)
    }

    tick(ticks: number): void {
        this.mg.createAllianceRequest(this.requestor, this.recipient)
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