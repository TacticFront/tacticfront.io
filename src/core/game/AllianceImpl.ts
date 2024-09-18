import {MutableAlliance, MutablePlayer, Player} from "./Game";
import {PlayerImpl} from "./PlayerImpl";

export class AllianceImpl implements MutableAlliance {
    constructor(
        readonly requestor_: PlayerImpl,
        readonly recepient_: PlayerImpl,
        readonly createdAtTick_: number,
    ) { }

    requestor(): MutablePlayer {
        return this.requestor_
    }

    recipient(): MutablePlayer {
        return this.recepient_
    }

}