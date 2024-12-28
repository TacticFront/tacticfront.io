import { MutableAllianceRequest, MutablePlayer, Player, Tick } from "./Game";
import { GameImpl } from "./GameImpl";


export class AllianceRequestImpl implements MutableAllianceRequest {

    constructor(private requestor_: MutablePlayer, private recipient_: MutablePlayer, private tickCreated: number, private game: GameImpl) { }

    requestor(): MutablePlayer {
        return this.requestor_;
    }

    recipient(): MutablePlayer {
        return this.recipient_;
    }

    createdAt(): Tick {
        return this.tickCreated
    }

    accept(): void {
        this.game.acceptAllianceRequest(this)
    }
    reject(): void {
        this.game.rejectAllianceRequest(this)
    }

}
