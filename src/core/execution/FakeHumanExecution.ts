import { Cell, Execution, MutableGame, MutablePlayer, Player, PlayerInfo, PlayerType, TerrainType, TerraNullius, Tile } from "../game/Game"
import { PseudoRandom } from "../PseudoRandom"
import { and, bfs, dist, simpleHash } from "../Util";
import { AttackExecution } from "./AttackExecution";
import { TransportShipExecution } from "./TransportShipExecution";
import { SpawnExecution } from "./SpawnExecution";

export class FakeHumanExecution implements Execution {

    private firstMove = true

    private active = true
    private random: PseudoRandom;
    private attackRate: number
    private mg: MutableGame
    private neighborsTerraNullius = true
    private player: MutablePlayer = null

    private enemy: Player | null = null

    private rejected: Set<Player> = new Set<Player>
    private isTraitor = false

    private relations = new Map<Player, number>()

    constructor(private playerInfo: PlayerInfo, private cell: Cell, private strength: number) {
        this.random = new PseudoRandom(simpleHash(playerInfo.id))
    }

    init(mg: MutableGame, ticks: number) {
        this.mg = mg
        if (this.random.chance(5)) {
            this.isTraitor = true
        }
    }

    tick(ticks: number) {

        if (this.mg.inSpawnPhase()) {
            if (ticks % this.random.nextInt(5, 30) == 0) {
                const rl = this.randomLand()
                if (rl == null) {
                    console.warn(`cannot spawn ${this.playerInfo.name}`)
                    return
                }
                this.mg.addExecution(new SpawnExecution(
                    this.playerInfo,
                    rl.cell()
                ))
            }
            return
        }
        if (this.player == null) {
            this.player = this.mg.players().find(p => p.id() == this.playerInfo.id)
            if (this.player == null) {
                return
            } else {
                this.player.setTroops(this.player.troops() * this.strength)
            }
        }
        if (this.firstMove) {
            this.firstMove = false
            this.sendAttack(this.mg.terraNullius())
            return
        }

        if (this.player.troops() < this.mg.config().maxPopulation(this.player) / 4) {
            return
        }

        if (ticks % this.random.nextInt(10, 30) != 0) {
            return
        }

        this.handleAllianceRequests()

        if (ticks % 100 == 0) {
            this.enemy = null
        }

        if (this.enemy == null) {
            this.enemy = this.mg.executions()
                .filter(e => e instanceof AttackExecution)
                .map(e => e as AttackExecution)
                .filter(e => e.targetID() == this.player.id())
                .map(e => e.owner())
                .find(enemy => enemy && enemy.type() == PlayerType.Human)
        }

        if (this.enemy) {
            if (this.player.sharesBorderWith(this.enemy)) {
                this.sendAttack(this.enemy)
            }
            return
        }


        if (this.neighborsTerraNullius) {
            for (const b of this.player.borderTiles()) {
                for (const n of b.neighbors()) {
                    if (n.owner() == this.mg.terraNullius() && n.isLand()) {
                        this.sendAttack(this.mg.terraNullius())
                        return
                    }
                }
            }
            this.neighborsTerraNullius = false
        }

        const enemyborder = Array.from(this.player.borderTiles()).flatMap(t => t.neighbors()).filter(t => t.hasOwner() && t.owner() != this.player)

        if (enemyborder.length == 0 || this.random.chance(5)) {
            this.sendBoat()
            return
        }

        const enemies = enemyborder.map(t => t.owner()).filter(o => o.isPlayer()).map(o => o as Player).sort((a, b) => a.troops() - b.troops())

        if (this.random.chance(10)) {
            const toAlly = this.random.randElement(enemies)
            if (!this.player.isAlliedWith(toAlly) && !this.player.recentOrPendingAllianceRequestWith(toAlly)) {
                this.player.createAllianceRequest(toAlly)
                return
            }
        }

        if (this.random.chance(2)) {
            if (!this.player.isAlliedWith(enemies[0]) || (this.random.chance(50) && this.isTraitor)) {
                this.sendAttack(enemies[0])
            }
        } else {
            const toAttack = this.random.randElement(enemies)
            if (!this.player.isAlliedWith(toAttack) || (this.random.chance(100) && this.isTraitor)) {
                this.sendAttack(toAttack)
            }
        }
    }

    handleAllianceRequests() {
        for (const req of this.player.incomingAllianceRequests()) {

            if (req.requestor().numTilesOwned() > this.player.numTilesOwned() * 2) {
                req.accept()
                continue
            }
            if (req.recipient().numTilesOwned() > this.player.numTilesOwned()) {
                if (this.random.chance(2)) {
                    req.accept()
                } else {
                    req.reject()
                    this.rejected.add(req.recipient())
                }
                continue
            }
            if (this.random.chance(5)) {
                req.accept()
            } else {
                req.reject()
                this.rejected.add(req.recipient())
            }
        }
    }

    sendBoat(tries: number = 0, oceanShore: Tile[] = null) {
        if (tries > 10) {
            return
        }

        if (oceanShore == null) {
            oceanShore = Array.from(this.player.borderTiles()).filter(t => t.isOceanShore())
        }
        if (oceanShore.length == 0) {
            return
        }

        const src = this.random.randElement(oceanShore)
        const otherShore = Array.from(
            bfs(
                src,
                and((t) => t.isOcean() || t.isOceanShore(), dist(src, 200))
            )
        ).filter(t => t.isOceanShore() && t.owner() != this.player)

        if (otherShore.length == 0) {
            return
        }

        for (let i = 0; i < 20; i++) {
            const dst = this.random.randElement(otherShore)
            if (this.isSmallIsland(dst)) {
                continue
            }
            if (dst.owner().isPlayer() && this.player.isAlliedWith(dst.owner() as Player)) {
                continue
            }

            this.mg.addExecution(new TransportShipExecution(
                this.player.id(),
                dst.hasOwner() ? dst.owner().id() : null,
                dst.cell(),
                this.player.troops() / 5,
            ))
            return
        }
        this.sendBoat(tries + 1, oceanShore)
    }

    randomLand(): Tile | null {
        const delta = 25
        let tries = 0
        while (tries < 50) {
            tries++
            const cell = new Cell(
                this.random.nextInt(this.cell.x - delta, this.cell.x + delta),
                this.random.nextInt(this.cell.y - delta, this.cell.y + delta)
            )
            if (!this.mg.isOnMap(cell)) {
                continue
            }
            const tile = this.mg.tile(cell)
            if (tile.isLand() && !tile.hasOwner()) {
                if (tile.terrain() == TerrainType.Mountain && this.random.chance(2)) {
                    continue
                }
                return tile
            }
        }
        return null
    }

    sendAttack(toAttack: Player | TerraNullius) {
        this.mg.addExecution(new AttackExecution(
            this.player.troops() / 5,
            this.player.id(),
            toAttack.isPlayer() ? toAttack.id() : null,
            null,
            null
        ))
    }

    isSmallIsland(tile: Tile): boolean {
        return bfs(tile, and((t) => t.isLand(), dist(tile, 10))).size < 50
    }

    owner(): MutablePlayer {
        return null
    }

    isActive(): boolean {
        return this.active
    }

    activeDuringSpawnPhase(): boolean {
        return true
    }
}