import { Cell, Execution, MutableGame, MutablePlayer, PlayerID, Tile, MutableUnit, UnitType } from "../game/Game";
import { PathFinder } from "../PathFinding";
import { PseudoRandom } from "../PseudoRandom";
import { bfs, dist, distSortUnit, euclideanDist, manhattanDist } from "../Util";

export class NukeExecution implements Execution {

    private player: MutablePlayer

    private active = true

    private mg: MutableGame

    private nuke: MutableUnit
    private dst: Tile

    private pathFinder: PathFinder = null

    constructor(
        private senderID: PlayerID,
        private cell: Cell,
        private magnitude: number | null
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this.mg = mg
        this.player = mg.player(this.senderID)
        if (this.magnitude == null) {
            this.magnitude = 50
        }
        this.dst = this.mg.tile(this.cell)
    }

    tick(ticks: number): void {
        if (this.nuke == null) {
            if (this.player.canBuild(UnitType.Nuke, this.dst)) {
                const spawn = this.player.units(UnitType.MissileSilo)
                    .sort((a, b) => manhattanDist(a.tile().cell(), this.cell) - manhattanDist(b.tile().cell(), this.cell))[0]
                this.nuke = this.player.buildUnit(UnitType.Nuke, 0, spawn.tile())
                this.pathFinder = new PathFinder(10_000, t => true)
            } else {
                console.warn(`cannot build Nuke`)
                this.active = false
                return
            }
        }
        if (this.nuke.tile() == this.dst) {
            this.detonate()
            return
        }
        for (let i = 0; i < 4; i++) {
            const nextTile = this.pathFinder.nextTile(this.nuke.tile(), this.dst)
            if (nextTile == null) {
                return
            }
            this.nuke.move(nextTile)
        }
    }

    private detonate() {
        const rand = new PseudoRandom(this.mg.ticks())
        const tile = this.mg.tile(this.cell)
        const toDestroy = bfs(tile, (n: Tile) => {
            const d = euclideanDist(tile.cell(), n.cell())
            return (d <= this.magnitude || rand.chance(2)) && d <= this.magnitude + 40
        })

        const ratio = Object.fromEntries(
            this.mg.players().map(p => [p.id(), p.troops() / p.numTilesOwned()])
        )


        for (const tile of toDestroy) {
            const owner = tile.owner()
            if (owner.isPlayer()) {
                const mp = this.mg.player(owner.id())
                mp.relinquish(tile)
                mp.removeTroops(ratio[mp.id()])
            }
        }
        this.mg.units()
            .filter(b => euclideanDist(this.cell, b.tile().cell()) < this.magnitude + 50)
            .forEach(b => b.delete())
        this.active = false
        this.nuke.delete()
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