import { AllPlayers, Cell, Execution, MutableGame, MutablePlayer, MutableUnit, PlayerID, UnitType } from "../game/Game";

export class DestroyerExecution implements Execution {

    private _owner: MutablePlayer
    private active = true
    private destroyer: MutableUnit = null
    private mg: MutableGame = null

    constructor(
        private playerID: PlayerID,
        private cell: Cell,
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this._owner = mg.player(this.playerID)
        this.mg = mg
    }

    tick(ticks: number): void {
        if (this.destroyer == null) {
            this.destroyer = this._owner.addUnit(UnitType.Destroyer, 0, this.mg.tile(this.cell))
        }
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