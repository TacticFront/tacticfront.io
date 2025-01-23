import { consolex } from "../../Consolex";
import { AllianceRequest, Execution, MutableGame, Player, PlayerID } from "../../game/Game";

export class AllianceRequestReplyExecution implements Execution {
    private active = true
    private mg: MutableGame = null
    private requestor: Player;
    private recipient: Player

    constructor(private requestorID: PlayerID, private recipientID: PlayerID, private accept: boolean) { }

    init(mg: MutableGame, ticks: number): void {
        this.mg = mg
        this.requestor = mg.player(this.requestorID)
        this.recipient = mg.player(this.recipientID)
    }

    tick(ticks: number): void {
        if (this.requestor.isAlliedWith(this.recipient)) {
            consolex.warn('already allied')
        } else {
            const request = this.requestor.outgoingAllianceRequests().find(ar => ar.recipient() == this.recipient)
            if (request == null) {
                consolex.warn('no alliance request found')
            } else {
                if (this.accept) {
                    request.accept()
                    this.requestor.updateRelation(this.recipient, 100)
                    this.recipient.updateRelation(this.requestor, 100)
                } else {
                    request.reject()
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