import { Unit, Cell, Execution, MutableUnit, MutableGame, MutablePlayer, Player, PlayerID, TerraNullius, Tile, TileEvent, UnitType } from "../game/Game";
import { and, bfs, manhattanDistWrapped, sourceDstOceanShore } from "../Util";
import { AttackExecution } from "./AttackExecution";
import { DisplayMessageEvent, MessageType } from "../../client/graphics/layers/EventsDisplay";
import { AStar, PathFinder } from "../PathFinding";

export class TransportShipExecution implements Execution {

    private lastMove: number

    // TODO: make this configurable
    private ticksPerMove = 1

    private active = true

    private mg: MutableGame
    private attacker: MutablePlayer
    private target: MutablePlayer | TerraNullius

    // TODO make private
    public path: Tile[]
    private src: Tile | null
    private dst: Tile | null


    private boat: MutableUnit

    private pathFinder: PathFinder = new PathFinder(10_000, t => t.isWater())

    constructor(
        private attackerID: PlayerID,
        private targetID: PlayerID | null,
        private cell: Cell,
        private troops: number | null,
    ) { }

    activeDuringSpawnPhase(): boolean {
        return false
    }

    init(mg: MutableGame, ticks: number) {
        this.lastMove = ticks
        this.mg = mg

        this.attacker = mg.player(this.attackerID)

        if (this.attacker.units(UnitType.TransportShip).length >= mg.config().boatMaxNumber()) {
            mg.displayMessage(`No boats available, max ${mg.config().boatMaxNumber()}`, MessageType.WARN, this.attackerID)
            this.active = false
            this.attacker.addTroops(this.troops)
            return
        }

        if (this.targetID == null || this.targetID == this.mg.terraNullius().id()) {
            this.target = mg.terraNullius()
        } else {
            this.target = mg.player(this.targetID)
        }

        if (this.troops == null) {
            this.troops = this.mg.config().boatAttackAmount(this.attacker, this.target)
        }

        this.troops = Math.min(this.troops, this.attacker.troops())
        this.attacker.removeTroops(this.troops)

        const [srcTile, dstTile]: [Tile | null, Tile | null] = sourceDstOceanShore(this.mg, this.attacker, this.target, this.cell);
        this.src = srcTile
        this.dst = dstTile

        if (this.src == null || this.dst == null) {
            this.active = false
            return
        }
        if (manhattanDistWrapped(this.src.cell(), this.dst.cell(), mg.width()) > mg.config().boatMaxDistance()) {
            mg.displayMessage(`Cannot send boat: destination is too far away`, MessageType.WARN, this.attackerID)
            this.active = false
            return
        }


        this.boat = this.attacker.addUnit(UnitType.TransportShip, this.troops, this.src)
    }

    tick(ticks: number) {
        if (!this.active) {
            return
        }
        if (!this.boat.isActive()) {
            this.active = false
            return
        }
        if (ticks - this.lastMove < this.ticksPerMove) {
            return
        }
        this.lastMove = ticks


        if (this.boat.tile() == this.dst) {
            if (this.dst.owner() == this.attacker) {
                this.attacker.addTroops(this.troops)
                this.boat.delete()
                this.active = false
                return
            }
            if (this.target.isPlayer() && this.attacker.isAlliedWith(this.target)) {
                this.target.addTroops(this.troops)
            } else {
                this.attacker.conquer(this.dst)
                this.mg.addExecution(
                    new AttackExecution(this.troops, this.attacker.id(), this.targetID, this.dst.cell(), null, false)
                )
            }
            this.boat.delete()
            this.active = false
            return
        }

        const nextTile = this.pathFinder.nextTile(this.boat.tile(), this.dst)
        if (nextTile == null) {
            console.warn('boat computing')
            return
        }
        this.boat.move(nextTile)
    }

    owner(): MutablePlayer {
        return this.attacker
    }

    isActive(): boolean {
        return this.active
    }

}

