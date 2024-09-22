import {AllianceRequest, Execution, MutableGame, MutablePlayer, Player, PlayerID} from "../../game/Game";

export class BreakAllianceExecution implements Execution {
    private active = true
    private requestor: MutablePlayer;
    private recipient: MutablePlayer

    constructor(private requestorID: PlayerID, private recipientID: PlayerID) { }

    init(mg: MutableGame, ticks: number): void {
        this.requestor = mg.player(this.requestorID)
        this.recipient = mg.player(this.recipientID)
    }

    tick(ticks: number): void {
        const alliance = this.requestor.allianceWith(this.recipient)
        if (alliance == null) {
            console.warn('cant break alliance, not allied')
        } else {
            this.requestor.breakAlliance(alliance)
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