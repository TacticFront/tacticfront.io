import {MutableAllianceRequest, Player} from "./Game";
import {GameImpl} from "./GameImpl";


export class AllianceRequestImpl implements MutableAllianceRequest {

    constructor(private requestor_, private recipient_, private tickCreated: number, private game: GameImpl) { }

    requestor(): Player {
        return this.requestor_;
    }

    recipient(): Player {
        return this.recipient_;
    }

    accept(): void {
        this.game.acceptAllianceRequest(this)
    }
    reject(): void {
        this.game.rejectAllianceRequest(this)
    }

}
