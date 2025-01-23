import { consolex } from "../Consolex";
import { Cell, DefenseBonus, Execution, Game, Player, Unit, PlayerID, UnitType } from "../game/Game";
import { manhattanDistFN, TileRef } from "../game/GameMap";

export class DefensePostExecution implements Execution {

    private player: Player
    private mg: Game
    private post: Unit
    private active: boolean = true

    private defenseBonuses: DefenseBonus[] = []

    constructor(private ownerId: PlayerID, private tile: TileRef) { }

    init(mg: Game, ticks: number): void {
        this.mg = mg
        this.player = mg.player(this.ownerId)
    }

    tick(ticks: number): void {
        if (this.post == null) {
            const spawnTile = this.player.canBuild(UnitType.DefensePost, this.tile)
            if (spawnTile == false) {
                consolex.warn('cannot build Defense Post')
                this.active = false
                return
            }
            this.post = this.player.buildUnit(UnitType.DefensePost, 0, spawnTile)
            this.mg.bfs(spawnTile, manhattanDistFN(spawnTile, this.mg.config().defensePostRange())).forEach(t => {
                if (this.mg.isLake(t)) {
                    this.defenseBonuses.push(
                        this.mg.addTileDefenseBonus(t, this.post, this.mg.config().defensePostDefenseBonus())
                    )
                }
            })
        }
        if (!this.post.isActive()) {
            this.defenseBonuses.forEach(df => this.mg.removeTileDefenseBonus(df))
            this.active = false
            return
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