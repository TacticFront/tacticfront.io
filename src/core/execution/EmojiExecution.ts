import { consolex } from "../Consolex";
import {AllPlayers, Execution, MutableGame, MutablePlayer, PlayerID} from "../game/Game";

export class EmojiExecution implements Execution {

    private requestor: MutablePlayer
    private recipient: MutablePlayer | typeof AllPlayers

    private active = true

    constructor(
        private senderID: PlayerID,
        private recipientID: PlayerID | typeof AllPlayers,
        private emoji: string
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this.requestor = mg.player(this.senderID)
        this.recipient = this.recipientID == AllPlayers ? AllPlayers : mg.player(this.recipientID)
    }

    tick(ticks: number): void {
        if (this.requestor.canSendEmoji(this.recipient)) {
            this.requestor.sendEmoji(this.recipient, this.emoji)
        } else {
            consolex.warn(`cannot send emoji from ${this.requestor} to ${this.recipient}`)
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