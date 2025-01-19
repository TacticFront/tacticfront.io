import { consolex } from "../Consolex";
import { Execution, MutableGame, MutablePlayer, MutableUnit, PlayerID, UnitType } from "../game/Game";
import { TileRef } from "../game/GameMap";

export class CityExecution implements Execution {

    private player: MutablePlayer
    private mg: MutableGame
    private city: MutableUnit
    private active: boolean = true

    constructor(private ownerId: PlayerID, private tile: TileRef) { }

    init(mg: MutableGame, ticks: number): void {
        this.mg = mg
        this.player = mg.player(this.ownerId)
    }

    tick(ticks: number): void {
        if (this.city == null) {
            const spawnTile = this.player.canBuild(UnitType.City, this.tile)
            if (spawnTile == false) {
                consolex.warn('cannot build city')
                this.active = false
                return
            }
            this.city = this.player.buildUnit(UnitType.City, 0, spawnTile)
        }
        if (!this.city.isActive()) {
            this.active = false
            return
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