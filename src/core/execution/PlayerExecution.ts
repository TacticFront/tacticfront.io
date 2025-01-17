import { Config } from "../configuration/Config"
import { Execution, MutableGame, MutablePlayer, Player, PlayerID, TerraNullius, Tile, UnitType } from "../game/Game"
import { bfs, calculateBoundingBox, getMode, inscribed, simpleHash } from "../Util"
import { GameImpl } from "../game/GameImpl"
import { consolex } from "../Consolex"
import { TileRef } from "../game/GameMap"

export class PlayerExecution implements Execution {

    private readonly ticksPerClusterCalc = 10

    private player: MutablePlayer
    private config: Config
    private lastCalc = 0
    private mg: MutableGame
    private active = true

    constructor(private playerID: PlayerID) {
    }

    activeDuringSpawnPhase(): boolean {
        return false
    }

    init(mg: MutableGame, ticks: number) {
        this.mg = mg
        this.config = mg.config()
        this.player = mg.player(this.playerID)
        this.lastCalc = ticks + (simpleHash(this.player.name()) % this.ticksPerClusterCalc)
    }

    tick(ticks: number) {
        this.player.decayRelations()
        this.player.units().forEach(u => {
            if (u.health() <= 0) {
                u.delete()
                return
            }
            u.modifyHealth(1)
            const tileOwner = u.tile().owner()
            if (u.info().territoryBound) {
                if (tileOwner.isPlayer()) {
                    if (tileOwner != this.player) {
                        this.mg.player(tileOwner.id()).captureUnit(u)
                    }
                } else {
                    u.delete()
                }
            }
        })

        if (!this.player.isAlive()) {
            this.player.units().forEach(u => {
                if (u.type() != UnitType.AtomBomb && u.type() != UnitType.HydrogenBomb) {
                    u.delete()
                }
            })
            this.active = false
            return
        }


        const popInc = this.config.populationIncreaseRate(this.player)
        this.player.addWorkers(popInc * (1 - this.player.targetTroopRatio()))// (1 - this.player.targetTroopRatio()))
        this.player.addTroops(popInc * this.player.targetTroopRatio())
        this.player.addGold(this.config.goldAdditionRate(this.player))
        const adjustRate = this.config.troopAdjustmentRate(this.player)
        this.player.addTroops(adjustRate)
        this.player.removeWorkers(adjustRate)

        const alliances = Array.from(this.player.alliances())
        for (const alliance of alliances) {
            if (this.mg.ticks() - alliance.createdAt() > this.mg.config().allianceDuration()) {
                alliance.expire()
            }
        }


        if (ticks - this.lastCalc > this.ticksPerClusterCalc) {
            if (this.player.lastTileChange() > this.lastCalc) {
                this.lastCalc = ticks
                const start = performance.now()
                // TODO
                // this.removeClusters()
                const end = performance.now()
                if (end - start > 1000) {
                    consolex.log(`player ${this.player.name()}, took ${end - start}ms`)
                }
            }
        }
    }


    private removeClusters() {
        const clusters = this.calculateClusters()
        // if (clusters.length <= 1) {
        //     return
        // }
        clusters.sort((a, b) => b.size - a.size);

        const main = clusters.shift()
        const surroundedBy = this.surroundedBySamePlayer(main)
        if (surroundedBy && !this.player.isAlliedWith(surroundedBy)) {
            this.removeCluster(main)
        }

        for (const cluster of clusters) {
            if (this.isSurrounded(cluster)) {
                this.removeCluster(cluster)
            }
        }
    }

    private surroundedBySamePlayer(cluster: Set<TileRef>): false | Player {
        const enemies = new Set<number>()
        for (const ref of cluster) {
            if (this.mg.isOceanShore(ref) || this.mg.neighbors(ref).some(n => !this.mg.hasOwner(n))) {
                return false
            }
            this.mg.neighbors(ref)
                .filter(n => this.mg.ownerID(n) != this.player.smallID())
                .forEach(p => enemies.add(this.mg.ownerID(p)))
            if (enemies.size != 1) {
                return false
            }
        }
        if (enemies.size != 1) {
            return false
        }
        return this.mg.playerBySmallID(Array.from(enemies)[0]) as Player
    }

    private isSurrounded(cluster: Set<TileRef>): boolean {
        let enemyTiles = new Set<TileRef>()
        for (const tr of cluster) {
            if (this.mg.isOceanShore(tr)) {
                return false
            }
            this.mg.neighbors(tr)
                .filter(n => this.mg.ownerID(n) != this.player.smallID())
                .forEach(n => enemyTiles.add(n))
        }
        if (enemyTiles.size == 0) {
            return false
        }
        const enemyBox = calculateBoundingBox(new Set(Array.from(enemyTiles).map(tr => this.mg.fromRef(tr))))
        const clusterBox = calculateBoundingBox(new Set(Array.from(cluster).map(tr => this.mg.fromRef(tr))))
        return inscribed(enemyBox, clusterBox)
    }

    private removeCluster(cluster: Set<TileRef>) {
        const arr = Array.from(cluster)
        const mode = getMode(
            arr.
                flatMap(t => this.mg.neighbors(t))
                .filter(t => this.mg.ownerID(t) != this.player.smallID())
                .map(t => this.mg.ownerID(t))
        )
        if (!this.mg.playerBySmallID(mode).isPlayer()) {
            consolex.warn('mode is not found')
            return
        }
        const firstTile = arr[0]
        const filter = (n: Tile): boolean => n.owner().smallID() == this.mg.ownerID(firstTile)
        const tiles = bfs(this.mg.fromRef(firstTile), filter)

        const modePlayer = this.mg.playerBySmallID(mode)
        if (!modePlayer.isPlayer()) {
            consolex.warn('mode player is null')
        }
        for (const tile of tiles) {
            (modePlayer as MutablePlayer).conquer(tile)
        }
    }

    private calculateClusters(): Set<TileRef>[] {
        const seen = new Set<TileRef>()
        const border = this.player.borderTileRefs()
        const clusters: Set<TileRef>[] = []
        for (const tile of border) {
            if (seen.has(tile)) {
                continue
            }

            const cluster = new Set<TileRef>()
            const queue: TileRef[] = [tile]
            seen.add(tile)
            let loops = 0;
            while (queue.length > 0) {
                loops += 1
                const curr = queue.shift()
                cluster.add(curr)

                const neighbors = (this.mg as GameImpl).neighborsWithDiag(this.mg.fromRef(curr))
                for (const neighbor of neighbors) {
                    if (neighbor.isBorder() && border.has(neighbor.ref())) {
                        if (!seen.has(neighbor.ref())) {
                            queue.push(neighbor.ref())
                            seen.add(neighbor.ref())
                        }
                    }
                }
            }
            clusters.push(cluster)
        }
        return clusters
    }

    owner(): MutablePlayer {
        return this.player
    }

    isActive(): boolean {
        return this.active
    }
}