import {MutableAllianceRequest, Player, Tick} from "./Game";
import {GameImpl} from "./GameImpl";


export class AllianceRequestImpl implements MutableAllianceRequest {

    constructor(private requestor_, private recipient_, private tickCreated: number, private game: GameImpl) { }

    requestor(): Player {
        return this.requestor_;
    }

    recipient(): Player {
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
