import {Cell, Execution, MutableGame, MutablePlayer, PlayerID, Tile} from "../game/Game";
import {PseudoRandom} from "../PseudoRandom";
import {bfs, dist, euclideanDist, manhattanDist} from "../Util";

export class NukeExecution implements Execution {

    private sender: MutablePlayer

    private active = true

    private toDestroy: Set<Tile> = new Set()

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
            this.magnitude = 70
        }
        const rand = new PseudoRandom(mg.ticks())
        const tile = mg.tile(this.cell)
        this.toDestroy = bfs(tile, (n: Tile) => {
            const d = euclideanDist(tile.cell(), n.cell())
            return (d <= this.magnitude || rand.chance(2)) && d <= this.magnitude + 30
        })
    }


    tick(ticks: number): void {
        for (const tile of this.toDestroy) {
            const owner = tile.owner()
            if (owner.isPlayer()) {
                this.mg.player(owner.id()).relinquish(tile)
            }
        }
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