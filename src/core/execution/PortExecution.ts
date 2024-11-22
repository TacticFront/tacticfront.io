import { AllPlayers, Cell, Execution, MutableGame, MutablePlayer, MutableUnit, Player, PlayerID, Tile, Unit, UnitType } from "../game/Game";
import { AStar, PathFinder, PathFindResultType } from "../PathFinding";
import { PseudoRandom } from "../PseudoRandom";
import { bfs, dist, manhattanDist } from "../Util";
import { TradeShipExecution } from "./TradeShipExecution";

export class PortExecution implements Execution {

    private active = true
    private mg: MutableGame
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
        this.random = new PseudoRandom(mg.ticks())
    }

    tick(ticks: number): void {
        if (this.port == null) {
            const tile = this.mg.tile(this.cell)
            const player = this.mg.player(this._owner)
            if (!player.canBuild(UnitType.Port, tile)) {
                console.warn(`player ${player} cannot build port at ${this.cell}`)
                this.active = false
                return
            }
            const spawns = Array.from(bfs(tile, dist(tile, 20)))
                .filter(t => t.isOceanShore() && t.owner() == player)
                .sort((a, b) => manhattanDist(a.cell(), tile.cell()) - manhattanDist(b.cell(), tile.cell()))

            if (spawns.length == 0) {
                console.warn(`cannot find spawn for port`)
                this.active = false
                return
            }
            this.port = player.buildUnit(UnitType.Port, 0, spawns[0])
        }


        const alliedPorts = this.player().alliances().map(a => a.other(this.player())).flatMap(p => p.units(UnitType.Port))
        const alliedPortsSet = new Set(alliedPorts)

        for (const port of alliedPorts) {
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
            } else if (!this.portPaths.has(port)) {
                this.computingPaths.set(port, new AStar(this.port.tile(), port.tile(), t => t.isWater(), 2000, 100))
                continue
            }
        }

        for (const port of this.portPaths.keys()) {
            if (!port.isActive() || !alliedPortsSet.has(port)) {
                this.portPaths.delete(port)
                this.computingPaths.delete(port)
            }
        }

        if (alliedPorts.length > 0 && this.random.chance(50)) {
            const port = this.random.randElement(alliedPorts)
            const path = this.portPaths.get(port)
            if (path != null) {
                this.mg.addExecution(new TradeShipExecution(this._owner, this.port, port, path))
            }
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

    player(): MutablePlayer {
        return this.port.owner()
    }

}