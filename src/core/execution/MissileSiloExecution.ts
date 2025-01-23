import { consolex } from "../Consolex";
import { Cell, Execution, MutableGame, Player, MutableUnit, PlayerID, UnitType } from "../game/Game";
import { TileRef } from "../game/GameMap";

export class MissileSiloExecution implements Execution {

    private active = true
    private mg: MutableGame
    private player: Player
    private silo: MutableUnit

    constructor(
        private _owner: PlayerID,
        private tile: TileRef
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this.mg = mg
        this.player = mg.player(this._owner)
    }

    tick(ticks: number): void {
        if (this.silo == null) {
            if (!this.player.canBuild(UnitType.MissileSilo, this.tile)) {
                consolex.warn(`player ${this.player} cannot build port at ${this.tile}`)
                this.active = false
                return
            }
            this.silo = this.player.buildUnit(UnitType.MissileSilo, 0, this.tile)
        }
    }

    owner(): Player {
        return null
    }

    isActive(): boolean {
        return this.active
    }

    activeDuringSpawnPhase(): boolean {
        return false
    }

}