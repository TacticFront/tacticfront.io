import { AllPlayers, Cell, Execution, MutableGame, MutablePlayer, MutableUnit, Player, PlayerID, Tile, Unit, UnitType } from "../game/Game";
import { AStar, PathFinder, PathFindResultType } from "../PathFinding";
import { PseudoRandom } from "../PseudoRandom";
import { bfs, dist, manhattanDist } from "../Util";
import { TradeShipExecution } from "./TradeShipExecution";

export class PortExecution implements Execution {

    private active = true
    private mg: MutableGame
    private player: MutablePlayer
    private port: MutableUnit
    private random: PseudoRandom
    private portPaths = new Map<MutableUnit, Tile[]>()
    private computingPaths = new Map<MutableUnit, AStar>()

    constructor(
        private _owner: PlayerID,
        private cell: Cell
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this.mg = mg
        this.player = mg.player(this._owner)
        this.random = new PseudoRandom(mg.ticks())
    }

    tick(ticks: number): void {
        if (this.port == null) {
            const tile = this.mg.tile(this.cell)
            if (!this.player.canBuild(UnitType.Port, tile)) {
                console.warn(`player ${this.player} cannot build port at ${this.cell}`)
                this.active = false
                return
            }
            const spawns = Array.from(bfs(tile, dist(tile, 20)))
                .filter(t => t.isOceanShore() && t.owner() == this.player)
                .sort((a, b) => manhattanDist(a.cell(), tile.cell()) - manhattanDist(b.cell(), tile.cell()))

            if (spawns.length == 0) {
                console.warn(`cannot find spawn for port`)
                this.active = false
                return
            }
            this.port = this.player.buildUnit(UnitType.Port, 0, spawns[0])
        }

        const allPorts = this.mg.units(UnitType.Port)
            .filter(u => u.owner() != this.player)
        if (allPorts.length == 0) {
            return
        }
        for (const port of allPorts) {
            if (this.computingPaths.has(port)) {
                const aStar = this.computingPaths.get(port)
                switch (aStar.compute()) {
                    case PathFindResultType.Completed:
                        this.portPaths.set(port, aStar.reconstructPath())
                        this.computingPaths.delete(port)
                    case PathFindResultType.Pending:
                        break
                    case PathFindResultType.PathNotFound:
                        console.warn(`path not found to port`)
                }
                continue
            }
            if (!this.portPaths.has(port)) {
                this.computingPaths.set(port, new AStar(this.port.tile(), port.tile(), t => t.isWater(), 10_000, 20))
                continue
            }
        }
        for (const port of this.portPaths.keys()) {
            if (!port.isActive()) {
                this.portPaths.delete(port)
            }
        }

        const allyPorts = Array.from(this.portPaths.keys())
            .filter(p => this.port.owner().isAlliedWith(p.owner()))
        if (allPorts.length > 0 && this.random.chance(50)) {
            const port = this.random.randElement(allPorts)
            const path = this.portPaths.get(port)
            this.mg.addExecution(new TradeShipExecution(this._owner, this.port, port, path))
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