import {EventBus} from "../EventBus";
import {Cell, Execution, MutableGame, MutablePlayer, Player, PlayerInfo, PlayerType, TerrainType, TerraNullius, Tile} from "../game/Game"
import {PseudoRandom} from "../PseudoRandom"
import {and, bfs, dist, simpleHash} from "../Util";
import {AttackExecution} from "./AttackExecution";
import {BoatAttackExecution} from "./BoatAttackExecution";
import {SpawnExecution} from "./SpawnExecution";

export class FakeHumanExecution implements Execution {

    private active = true
    private random: PseudoRandom;
    private attackRate: number
    private mg: MutableGame
    private neighborsTerraNullius = true
    private player: MutablePlayer = null

    private enemy: Player | null = null

    private rejected: Set<Player> = new Set<Player>
    private isTraitor = false


    constructor(private playerInfo: PlayerInfo) {
        this.random = new PseudoRandom(simpleHash(playerInfo.id))
    }

    init(mg: MutableGame, ticks: number) {
        this.mg = mg
        if (this.random.chance(2)) {
            this.isTraitor = true
        }
    }

    tick(ticks: number) {

        if (this.mg.inSpawnPhase()) {
            if (ticks % this.random.nextInt(5, 30) == 0) {
                this.mg.addExecution(new SpawnExecution(
                    this.playerInfo,
                    this.randomLand().cell()
                ))
            }
        }
        if (this.player == null) {
            this.player = this.mg.players().find(p => p.id() == this.playerInfo.id)
            if (this.player == null) {
                //console.log(`player with id ${this.playerInfo.id} not found in FakeHumanExecution`)
                return
            }
        }

        if (this.player.troops() < this.mg.config().maxTroops(this.player) / 4) {
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
            if (!this.player.isAlliedWith(toAlly)) {
                this.player.createAllianceRequest(toAlly)
            }
        }

        if (this.random.chance(2)) {
            if (!this.player.isAlliedWith(enemies[0]) || (this.random.chance(90) && this.isTraitor)) {
                this.sendAttack(enemies[0])
            }
        } else {
            if (!this.player.isAlliedWith(enemies[0]) || (this.random.chance(180) && this.isTraitor)) {
                this.sendAttack(this.random.randElement(enemies))
            }
        }
    }

    handleAllianceRequests() {
        for (const req of this.player.incomingAllianceRequests()) {
            if (this.rejected.has(req.requestor())) {
                continue
            }
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

    sendBoat(tries: number = 0) {
        if (tries > 100) {
            return
        }

        const oceanShore = Array.from(this.player.borderTiles()).filter(t => t.isOceanShore())
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

        for (let i = 0; i < 100; i++) {
            const dst = this.random.randElement(otherShore)
            if (this.isSmallIsland(dst)) {
                continue
            }

            this.mg.addExecution(new BoatAttackExecution(
                this.player.id(),
                dst.hasOwner() ? dst.owner().id() : null,
                dst.cell(),
                this.player.troops() / 5,
            ))
            return
        }
        this.sendBoat(tries + 1)

    }

    randomLand(): Tile {
        while (true) {
            const cell = new Cell(this.random.nextInt(0, this.mg.width()), this.random.nextInt(0, this.mg.height()))
            const tile = this.mg.tile(cell)
            if (tile.isLand() && !tile.hasOwner()) {
                if (tile.terrain() == TerrainType.Mountain && this.random.chance(2)) {
                    continue
                }
                return tile
            }
        }
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
        return bfs(tile, and((t) => t.isLand(), dist(tile, 50))).size < 50
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