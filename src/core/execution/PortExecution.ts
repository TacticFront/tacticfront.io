import { AllPlayers, Cell, Execution, MutableGame, MutablePlayer, PlayerID } from "../game/Game";

export class PortExecution implements Execution {

    private active = true

    constructor(
        private _owner: PlayerID,
        private cell: Cell
    ) { }


    init(mg: MutableGame, ticks: number): void {
    }

    tick(ticks: number): void {
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