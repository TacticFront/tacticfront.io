import {PriorityQueue} from "@datastructures-js/priority-queue";
import {Cell, Execution, MutableGame, MutablePlayer, Player, PlayerID, TerrainType, TerraNullius, Tile} from "../game/Game";
import {PseudoRandom} from "../PseudoRandom";
import {manhattanDist} from "../Util";
import {Terrain} from "../game/TerrainMapLoader";

export class AttackExecution implements Execution {
    private breakAlliance = false
    private active: boolean = true;
    private toConquer: PriorityQueue<TileContainer> = new PriorityQueue<TileContainer>((a: TileContainer, b: TileContainer) => {
        if (a.priority == b.priority) {
            if (a.tick == b.tick) {
                return 0
                // return this.random.nextInt(-1, 1)
            }
            return a.tick - b.tick
        }
        return a.priority - b.priority
    });
    private random = new PseudoRandom(123)

    private _owner: MutablePlayer
    private target: MutablePlayer | TerraNullius

    private mg: MutableGame

    private border = new Set<Tile>()

    constructor(
        private troops: number,
        private _ownerID: PlayerID,
        private _targetID: PlayerID | null,
        private sourceCell: Cell | null,
        private targetCell: Cell | null,
    ) { }

    public targetID(): PlayerID {
        return this._targetID
    }

    activeDuringSpawnPhase(): boolean {
        return false
    }

    init(mg: MutableGame, ticks: number) {
        if (!this.active) {
            return
        }
        this.mg = mg

        this.targetCell = null

        this._owner = mg.player(this._ownerID)
        this.target = this._targetID == this.mg.terraNullius().id() ? mg.terraNullius() : mg.player(this._targetID)
        this.troops = Math.min(this._owner.troops(), this.troops)
        this._owner.setTroops(this._owner.troops() - this.troops)

        for (const exec of mg.executions()) {
            if (exec.isActive() && exec instanceof AttackExecution && exec != this) {
                const otherAttack = exec as AttackExecution
                // Target has opposing attack, cancel them out
                if (this.target.isPlayer() && otherAttack._targetID == this._ownerID && this._targetID == otherAttack._ownerID) {
                    if (otherAttack.troops > this.troops) {
                        otherAttack.troops -= this.troops
                        // otherAttack.calculateToConquer()
                        this.active = false
                        return
                    } else {
                        this.troops -= otherAttack.troops
                        otherAttack.active = false
                    }
                }
                // Existing attack on same target, add troops
                if (otherAttack._owner == this._owner && otherAttack._targetID == this._targetID && this.sourceCell == otherAttack.sourceCell) {
                    otherAttack.troops += this.troops
                    otherAttack.refreshToConquer()
                    this.active = false
                    return
                }
            }
        }
        if (this.sourceCell != null) {
            this.addNeighbors(mg.tile(this.sourceCell))
        } else {
            this.refreshToConquer()
        }

        if (this.target.isPlayer()) {
            if (this._owner.alliedWith(this.target)) {
                // No updates should happen in init.
                this.breakAlliance = true
            }
        }

    }

    private refreshToConquer() {
        this.toConquer.clear()
        this.border.clear()
        for (const tile of this._owner.borderTiles()) {
            this.addNeighbors(tile)
        }
    }

    tick(ticks: number) {
        if (!this.active) {
            return
        }
        if (ticks < this.mg.config().numSpawnPhaseTurns()) {
            return
        }
        if (this.breakAlliance) {
            this.breakAlliance = false
            this._owner.breakAllianceWith(this.target as Player)
        }
        if (this.target.isPlayer() && this._owner.alliedWith(this.target)) {
            // In this case a new alliance was created AFTER the attack started.
            this._owner.addTroops(this.troops)
            this.active = false
            return
        }

        let numTilesPerTick = this.mg.config().attackTilesPerTick(this._owner, this.target, this.border.size + this.random.nextInt(0, 5))
        // console.log(`num tiles per tick: ${numTilesPerTick}`)
        // console.log(`num execs: ${this.mg.executions().length}`)


        while (numTilesPerTick > 0) {
            if (this.troops < 1) {
                this.active = false
                return
            }

            if (this.toConquer.size() == 0) {
                this.refreshToConquer()
                this.active = false
                this._owner.addTroops(this.troops)
                return
            }

            const tileToConquer = this.toConquer.dequeue().tile
            this.border.delete(tileToConquer)

            const onBorder = tileToConquer.neighbors().filter(t => t.owner() == this._owner).length > 0
            if (tileToConquer.owner() != this.target || !onBorder) {
                continue
            }
            this.addNeighbors(tileToConquer)
            const {attackerTroopLoss, defenderTroopLoss, tilesPerTickUsed} = this.mg.config().attackLogic(this.troops, this._owner, this.target, tileToConquer)
            numTilesPerTick -= tilesPerTickUsed
            this.troops -= attackerTroopLoss
            if (this.target.isPlayer()) {
                this.target.removeTroops(defenderTroopLoss)
            }
            this._owner.conquer(tileToConquer)
            this.checkDefenderDead()
        }
    }

    private addNeighbors(tile: Tile) {
        for (const neighbor of tile.neighbors()) {
            if (neighbor.isWater() || neighbor.owner() != this.target) {
                continue
            }
            this.border.add(neighbor)
            let numOwnedByMe = neighbor.neighbors()
                .filter(t => t.isLand())
                .filter(t => t.owner() == this._owner)
                .length
            let dist = 0
            if (this.targetCell != null) {
                dist = manhattanDist(tile.cell(), this.targetCell)
            }
            if (numOwnedByMe > 2) {
                numOwnedByMe = 10
            }
            let mag = 0
            switch (tile.terrain()) {
                case TerrainType.Plains:
                    mag = 1
                    break
                case TerrainType.Highland:
                    mag = 2
                    break
                case TerrainType.Mountain:
                    mag = 3
                    break
            }
            this.toConquer.enqueue(new TileContainer(
                neighbor,
                dist / 100 + this.random.nextInt(0, 2) - numOwnedByMe + mag,
                this.mg.ticks()
            ))
        }
    }

    private checkDefenderDead() {
        if (this.target.isPlayer() && this.target.numTilesOwned() < 100) {
            for (let i = 0; i < 10; i++) {
                for (const tile of this.target.tiles()) {
                    if (tile.borders(this._owner)) {
                        this._owner.conquer(tile)
                    } else {
                        for (const neighbor of tile.neighbors()) {
                            const no = neighbor.owner()
                            if (no.isPlayer() && no != this.target) {
                                this.mg.player(no.id()).conquer(tile)
                                break
                            }
                        }
                    }
                }
            }
        }
    }

    owner(): MutablePlayer {
        return this._owner
    }

    isActive(): boolean {
        return this.active
    }

}


class TileContainer {
    constructor(public readonly tile: Tile, public readonly priority: number, public readonly tick: number) { }
}