import { Cell, Execution, MutableGame, MutablePlayer, MutableUnit, PlayerID, Tile, UnitType } from "../game/Game";

export class DefensePostExecution implements Execution {

    private player: MutablePlayer
    private mg: MutableGame
    private post: MutableUnit
    private tile: Tile
    private active: boolean = true

    constructor(private ownerId: PlayerID, private cell: Cell) { }

    init(mg: MutableGame, ticks: number): void {
        this.mg = mg
        this.tile = mg.tile(this.cell)
        this.player = mg.player(this.ownerId)
    }

    tick(ticks: number): void {
        if (this.post == null) {
            const spawnTile = this.player.canBuild(UnitType.DefensePost, this.tile)
            if (spawnTile == false) {
                console.warn('cannot build Defense Post')
                this.active = false
                return
            }
            this.post = this.player.buildUnit(UnitType.DefensePost, 0, spawnTile)
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