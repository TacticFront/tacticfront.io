import {Cell, Execution, MutableGame, MutablePlayer, PlayerID, Tile} from "../game/Game";
import {PseudoRandom} from "../PseudoRandom";
import {bfs, dist, euclideanDist, manhattanDist} from "../Util";

export class NukeExecution implements Execution {

    private sender: MutablePlayer

    private active = true

    private mg: MutableGame

    constructor(
        private senderID: PlayerID,
        private cell: Cell,
        private magnitude: number | null
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this.mg = mg
        this.sender = mg.player(this.senderID)
        if (this.magnitude == null) {
            this.magnitude = 50
        }
    }

    tick(ticks: number): void {
        const rand = new PseudoRandom(this.mg.ticks())
        const tile = this.mg.tile(this.cell)
        const toDestroy = bfs(tile, (n: Tile) => {
            const d = euclideanDist(tile.cell(), n.cell())
            return (d <= this.magnitude || rand.chance(2)) && d <= this.magnitude + 40
        })

        for (const tile of toDestroy) {
            const owner = tile.owner()
            if (owner.isPlayer()) {
                const mp = this.mg.player(owner.id())
                mp.relinquish(tile)
                mp.removeTroops(mp.troops() / mp.numTilesOwned())
            }
        }
        this.mg.boats().filter(b => euclideanDist(this.cell, b.tile().cell()) < this.magnitude + 50).forEach(b => b.delete())
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