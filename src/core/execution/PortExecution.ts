import { BuildValidator } from "../game/BuildValidator";
import { AllPlayers, BuildItem, BuildItems, Cell, Execution, MutableGame, MutablePlayer, MutableUnit, Player, PlayerID, Tile, Unit, UnitType } from "../game/Game";
import { AStar, PathFinder } from "../PathFinding";
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
            if (!new BuildValidator(this.mg).canBuild(this.player, tile, BuildItems.Port)) {
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
            this.port = this.player.addUnit(UnitType.Port, 0, spawns[0])
        }


        if (!this.port.tile().hasOwner()) {
            this.port.delete()
            this.active = false
            return
        }
        if (this.port.tile().owner() != this.port.owner()) {
            this.port.setOwner(this.port.tile().owner() as Player)
        }

        const ports = this.mg.units(UnitType.Port)
            .filter(u => u.owner() != this.player)
        if (ports.length == 0) {
            return
        }
        for (const port of ports) {
            if (this.computingPaths.has(port)) {
                const aStar = this.computingPaths.get(port)
                if (aStar.compute(10_000)) {
                    this.portPaths.set(port, aStar.reconstructPath())
                    this.computingPaths.delete(port)
                }
                continue
            }
            if (!this.portPaths.has(port)) {
                this.computingPaths.set(port, new AStar(this.port.tile(), port.tile()))
                continue
            }
        }
        if (this.random.chance(50)) {
            const port = this.random.randElement(Array.from(this.portPaths.keys()))
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