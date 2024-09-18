import {Execution, MutableGame, MutablePlayer, PlayerID} from "../game/Game"
import {ClientID} from "../Schemas"

export class UpdateNameExecution implements Execution {

    private active = true
    private mg: MutableGame

    constructor(private newName: string, private clientID: ClientID) {
    }

    init(mg: MutableGame, ticks: number) {
        this.mg = mg
    }

    tick(ticks: number) {
        const player = this.mg.players().find(p => p.clientID() == this.clientID)
        if (player == null) {
            return
        }
        player.setName(this.newName)
        this.active = false
    }

    owner(): MutablePlayer {
        return null
    }

    isActive(): boolean {
        return this.active
    }
    activeDuringSpawnPhase(): boolean {
        return true
    }
}