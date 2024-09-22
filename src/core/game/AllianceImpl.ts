import {MutableAlliance, MutableGame, MutablePlayer, Player, Tick} from "./Game";
import {GameImpl} from "./GameImpl";
import {PlayerImpl} from "./PlayerImpl";

export class AllianceImpl implements MutableAlliance {
    constructor(
        private readonly mg: GameImpl,
        readonly requestor_: PlayerImpl,
        readonly recipient_: PlayerImpl,
        readonly createdAtTick_: Tick,
    ) { }

    requestor(): MutablePlayer {
        return this.requestor_
    }

    recipient(): MutablePlayer {
        return this.recipient_
    }

    createdAt(): Tick {
        return this.createdAtTick_
    }

    expire(): void {

    }

}