import {AllianceRequest, Execution, MutableGame, MutablePlayer, Player, PlayerID} from "../game/Game";

export class AllianceRequestExecutionReply implements Execution {
    private active = true
    private mg: MutableGame = null
    private requestor: MutablePlayer;
    private recipient: MutablePlayer

    constructor(private requestorID: PlayerID, private recipientID: PlayerID, private accept: boolean) { }

    init(mg: MutableGame, ticks: number): void {
        this.mg = mg
        this.requestor = mg.player(this.requestorID)
        this.recipient = mg.player(this.recipientID)
    }

    tick(ticks: number): void {
        if (this.requestor.alliedWith(this.recipient)) {
            console.warn('already allied')
        } else {
            const request = this.requestor.outgoingAllianceRequests().find(ar => ar.recipient() == this.recipient)
            if (request == null) {
                console.warn('no alliance request found')
            } else {
                if (this.accept) {
                    request.accept()
                } else {
                    request.reject()
                }
            }
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