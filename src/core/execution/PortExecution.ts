import { AllPlayers, Cell, Execution, MutableGame, MutablePlayer, PlayerID, UnitType } from "../game/Game";

export class PortExecution implements Execution {

    private active = true
    private mg: MutableGame
    private player: MutablePlayer

    constructor(
        private _owner: PlayerID,
        private cell: Cell
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this.mg = mg
        this.player = mg.player(this._owner)
    }

    tick(ticks: number): void {
        this.player.addUnit(UnitType.Port, 0, this.mg.tile(this.cell))
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