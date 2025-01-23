import { nextTick } from "process";
import { Cell, Execution, Game, Player, PlayerID, Unit, UnitType, TerraNullius } from "../game/Game";
import { PathFinder } from "../pathfinding/PathFinding";
import { PathFindResultType } from "../pathfinding/AStar";
import { PseudoRandom } from "../PseudoRandom";
import { consolex } from "../Consolex";
import { TileRef } from "../game/GameMap";

export class NukeExecution implements Execution {

    private player: Player

    private active = true

    private mg: Game

    private nuke: Unit

    private pathFinder: PathFinder
    constructor(
        private type: UnitType.AtomBomb | UnitType.HydrogenBomb,
        private senderID: PlayerID,
        private dst: TileRef,
    ) { }


    init(mg: Game, ticks: number): void {
        this.mg = mg
        this.pathFinder = PathFinder.Mini(mg, 10_000, true)
        this.player = mg.player(this.senderID)
    }

    public target(): Player | TerraNullius {
        return this.mg.owner(this.dst)
    }

    tick(ticks: number): void {
        if (this.nuke == null) {
            const spawn = this.player.canBuild(this.type, this.dst)
            if (spawn == false) {
                consolex.warn(`cannot build Nuke`)
                this.active = false
                return
            }
            this.nuke = this.player.buildUnit(this.type, 0, spawn)
        }

        for (let i = 0; i < 4; i++) {
            const result = this.pathFinder.nextTile(this.nuke.tile(), this.dst)
            switch (result.type) {
                case PathFindResultType.Completed:
                    this.nuke.move(result.tile)
                    this.detonate()
                    return
                case PathFindResultType.NextTile:
                    this.nuke.move(result.tile)
                    break
                case PathFindResultType.Pending:
                    break
                case PathFindResultType.PathNotFound:
                    consolex.warn(`nuke cannot find path from ${this.nuke.tile()} to ${this.dst}`)
                    this.active = false
                    return
            }
        }
    }

    private detonate() {
        const magnitude = this.type == UnitType.AtomBomb ? { inner: 15, outer: 40 } : { inner: 140, outer: 160 }
        const rand = new PseudoRandom(this.mg.ticks())
        const toDestroy = this.mg.bfs(this.dst, (_, n: TileRef) => {
            const d = this.mg.euclideanDist(this.dst, n)
            return (d <= magnitude.inner || rand.chance(2)) && d <= magnitude.outer
        })

        const ratio = Object.fromEntries(
            this.mg.players().map(p => [p.id(), (p.troops() + p.workers()) / p.numTilesOwned()])
        )
        const attacked = new Map<Player, number>()
        for (const tile of toDestroy) {
            const owner = this.mg.owner(tile)
            if (owner.isPlayer()) {
                const mp = this.mg.player(owner.id())
                mp.relinquish(tile)
                mp.removeTroops(2 * ratio[mp.id()])
                if (!attacked.has(mp)) {
                    attacked.set(mp, 0)
                }
                const prev = attacked.get(mp)
                attacked.set(mp, prev + 1)
            }
            if (this.mg.isLand(tile)) {
                this.mg.setFallout(tile, true)
            }
        }
        for (const [other, tilesDestroyed] of attacked) {
            if (tilesDestroyed > 100) {
                const alliance = this.player.allianceWith(other)
                if (alliance != null) {
                    this.player.breakAlliance(alliance)
                }
                if (other != this.player) {
                    other.updateRelation(this.player, -100)
                }
            }
        }

        for (const unit of this.mg.units()) {
            if (unit.type() != UnitType.AtomBomb && unit.type() != UnitType.HydrogenBomb) {
                if (this.mg.euclideanDist(this.dst, unit.tile()) < magnitude.outer) {
                    unit.delete()
                }
            }
        }
        this.active = false
        this.nuke.delete(false)
    }

    owner(): Player {
        return this.player
    }

    isActive(): boolean {
        return this.active
    }

    activeDuringSpawnPhase(): boolean {
        return false
    }

}