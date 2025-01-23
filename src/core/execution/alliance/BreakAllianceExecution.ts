import { consolex } from "../../Consolex";
import { AllianceRequest, Execution, MutableGame, Player, PlayerID } from "../../game/Game";

export class BreakAllianceExecution implements Execution {
    private active = true
    private requestor: Player;
    private recipient: Player
    private mg: MutableGame

    constructor(private requestorID: PlayerID, private recipientID: PlayerID) { }

    init(mg: MutableGame, ticks: number): void {
        this.requestor = mg.player(this.requestorID)
        this.recipient = mg.player(this.recipientID)
        this.mg = mg
    }

    tick(ticks: number): void {
        const alliance = this.requestor.allianceWith(this.recipient)
        if (alliance == null) {
            consolex.warn('cant break alliance, not allied')
        } else {
            this.requestor.breakAlliance(alliance)
            this.recipient.updateRelation(this.requestor, -200)
            for (const player of this.mg.players()) {
                if (player != this.requestor) {
                    player.updateRelation(this.requestor, -40)
                }
            }
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