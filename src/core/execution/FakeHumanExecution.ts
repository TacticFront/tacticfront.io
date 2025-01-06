import { AllianceRequest, Cell, Difficulty, Execution, MutableGame, MutablePlayer, Player, PlayerInfo, PlayerType, Relation, TerrainType, TerraNullius, Tile, UnitType } from "../game/Game"
import { PseudoRandom } from "../PseudoRandom"
import { and, bfs, calculateBoundingBox, dist, euclDist, manhattanDist, simpleHash } from "../Util";
import { AttackExecution } from "./AttackExecution";
import { TransportShipExecution } from "./TransportShipExecution";
import { SpawnExecution } from "./SpawnExecution";
import { PortExecution } from "./PortExecution";
import { ParallelAStar, WorkerClient } from "../worker/WorkerClient";
import { PathFinder } from "../pathfinding/PathFinding";
import { DestroyerExecution } from "./DestroyerExecution";
import { BattleshipExecution } from "./BattleshipExecution";
import { GameID } from "../Schemas";
import { consolex } from "../Consolex";
import { CityExecution } from "./CityExecution";
import { NukeExecution } from "./NukeExecution";
import { MissileSiloExecution } from "./MissileSiloExecution";
import { EmojiExecution } from "./EmojiExecution";
import { AllianceRequestReplyExecution } from "./alliance/AllianceRequestReplyExecution";
import { closestTwoTiles } from "./Util";

export class FakeHumanExecution implements Execution {

    private firstMove = true

    private active = true
    private random: PseudoRandom;
    private mg: MutableGame
    private player: MutablePlayer = null

    private enemy: Player | null = null

    private lastEnemyUpdateTick: number = 0


    constructor(gameID: GameID, private worker: WorkerClient, private playerInfo: PlayerInfo, private cell: Cell, private strength: number) {
        this.random = new PseudoRandom(simpleHash(playerInfo.id) + simpleHash(gameID))
    }

    init(mg: MutableGame, ticks: number) {
        this.mg = mg
        if (this.random.chance(10)) {
            // this.isTraitor = true
        }
    }

    tick(ticks: number) {
        if (this.mg.inSpawnPhase()) {
            if (ticks % this.random.nextInt(5, 30) == 0) {
                const rl = this.randomLand()
                if (rl == null) {
                    consolex.warn(`cannot spawn ${this.playerInfo.name}`)
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
        if (!this.player.isAlive()) {
            this.active = false
            return
        }


        if (ticks % this.random.nextInt(40, 80) != 0) {
            return
        }


        if (this.player.troops() > 100_000 && this.player.targetTroopRatio() > .7) {
            this.player.setTargetTroopRatio(.7)
        }

        this.handleAllianceRequests()
        this.handleEnemies()
        this.handleUnits()

        const enemyborder = Array.from(this.player.borderTiles()).flatMap(t => t.neighbors()).filter(t => t.isLand() && t.owner() != this.player)

        if (enemyborder.length == 0) {
            if (this.random.chance(5)) {
                this.sendBoat()
            }
            return
        }
        if (this.random.chance(10)) {
            this.sendBoat()
            return
        }

        const enemiesWithTN = enemyborder.map(t => t.owner())
        if (enemiesWithTN.filter(o => !o.isPlayer()).length > 0) {
            this.sendAttack(this.mg.terraNullius())
            return
        }

        const enemies = enemiesWithTN.filter(o => o.isPlayer()).map(o => o as Player).sort((a, b) => a.troops() - b.troops())

        if (this.random.chance(20)) {
            const toAlly = this.random.randElement(enemies)
            if (!this.player.isAlliedWith(toAlly) && !this.player.recentOrPendingAllianceRequestWith(toAlly)) {
                this.player.createAllianceRequest(toAlly)
                return
            }
        }

        // 50-50 attack weakest player vs random player
        const toAttack = this.random.chance(2) ? enemies[0] : this.random.randElement(enemies)
        if (this.shouldAttack(toAttack)) {
            this.sendAttack(toAttack)
        }
    }

    private shouldAttack(other: Player): boolean {
        if (this.player.isAlliedWith(other)) {
            if (this.shouldDiscourageAttack(other)) {
                return this.random.chance(100)
            }
            return this.random.chance(20)
        } else {
            if (this.shouldDiscourageAttack(other)) {
                return this.random.chance(4)
            }
            return true
        }
    }

    shouldDiscourageAttack(other: Player) {
        if (other.isTraitor()) {
            return false
        }
        const difficulty = this.mg.config().gameConfig().difficulty
        if (difficulty == Difficulty.Hard || difficulty == Difficulty.Impossible) {
            return false
        }
        if (other.type() != PlayerType.Human) {
            return false
        }
        // Only discourage attacks on Humans who are not traitors on easy or medium difficulty.
        return true
    }

    handleEnemies() {
        if (this.mg.ticks() - this.lastEnemyUpdateTick > 100) {
            this.enemy = null
        }

        const target = this.player.allies()
            .filter(ally => this.player.relation(ally) == Relation.Friendly)
            .filter(ally => ally.targets().length > 0)
            .map(ally => ({ ally: ally, t: ally.targets()[0] }))[0] ?? null

        if (target != null && target.t != this.player && !this.player.isAlliedWith(target.t)) {
            this.player.updateRelation(target.ally, -20)
            this.enemy = target.t
            this.lastEnemyUpdateTick = this.mg.ticks()
            if (target.ally.type() == PlayerType.Human) {
                this.mg.addExecution(new EmojiExecution(this.player.id(), target.ally.id(), "👍"))
            }
        }

        if (this.enemy == null) {
            const mostHated = this.player.allRelationsSorted()[0] ?? null
            if (mostHated != null && mostHated.relation == Relation.Hostile) {
                this.enemy = mostHated.player
                this.lastEnemyUpdateTick = this.mg.ticks()
                if (this.enemy.type() == PlayerType.Human) {
                    this.mg.addExecution(
                        new EmojiExecution(
                            this.player.id(),
                            this.enemy.id(),
                            this.random.randElement(["🤡", "😡"])
                        )
                    )
                }
            }
        }

        if (this.player.isAlliedWith(this.enemy)) {
            this.enemy = null
            return
        }

        if (this.enemy) {
            this.maybeSendNuke(this.enemy)
            if (this.player.sharesBorderWith(this.enemy)) {
                this.sendAttack(this.enemy)
            } else {
                this.maybeSendBoatAttack(this.enemy)
            }
            return
        }
    }

    private maybeSendNuke(other: Player) {
        if (this.player.units(UnitType.MissileSilo).length == 0 ||
            this.player.gold() < this.mg.config().unitInfo(UnitType.AtomBomb).cost(this.player)) {
            return
        }
        outer:
        for (let i = 0; i < 10; i++) {
            const tile = this.randTerritoryTile(other)
            if (tile == null) {
                return
            }
            for (const t of bfs(tile, dist(tile, 15))) {
                // Make sure we nuke at least 15 tiles in border
                if (t.hasOwner() && t.owner() != other) {
                    continue outer
                }
            }
            if (this.player.canBuild(UnitType.AtomBomb, tile)) {
                this.mg.addExecution(
                    new NukeExecution(UnitType.AtomBomb, this.player.id(), tile.cell())
                )
                return
            }
        }
    }

    private maybeSendBoatAttack(other: Player) {
        const closest = closestTwoTiles(
            Array.from(this.player.borderTiles()).filter(t => t.isOceanShore()),
            Array.from(other.borderTiles()).filter(t => t.isOceanShore())
        )
        if (closest == null) {
            return
        }
        if (manhattanDist(closest.x.cell(), closest.y.cell()) < this.mg.config().boatMaxDistance()) {
            this.mg.addExecution(new TransportShipExecution(
                this.player.id(),
                other.id(),
                closest.y.cell(),
                this.player.troops() / 5
            ))
        }
    }

    private handleUnits() {
        const ports = this.player.units(UnitType.Port)
        if (ports.length == 0 && this.player.gold() > this.cost(UnitType.Port)) {
            const oceanTiles = Array.from(this.player.borderTiles()).filter(t => t.isOceanShore())
            if (oceanTiles.length > 0) {
                const buildTile = this.random.randElement(oceanTiles)
                this.mg.addExecution(new PortExecution(this.player.id(), buildTile.cell(), this.worker))
            }
            return
        }
        this.maybeSpawnStructure(UnitType.City, 2, t => new CityExecution(this.player.id(), t.cell()))
        if (this.maybeSpawnWarship(UnitType.Destroyer)) {
            return
        }
        if (this.maybeSpawnWarship(UnitType.Battleship)) {
            return
        }
        this.maybeSpawnStructure(UnitType.MissileSilo, 1, t => new MissileSiloExecution(this.player.id(), t.cell()))
    }

    private maybeSpawnStructure(type: UnitType, maxNum: number, build: (tile: Tile) => Execution) {
        const units = this.player.units(type)
        if (units.length >= maxNum) {
            return
        }
        if (this.player.gold() < this.mg.config().unitInfo(type).cost(this.player)) {
            return
        }
        const tile = this.randTerritoryTile(this.player)
        if (tile == null) {
            return
        }
        const canBuild = this.player.canBuild(type, tile)
        if (canBuild == false) {
            return
        }
        this.mg.addExecution(build(tile))
    }

    private maybeSpawnWarship(shipType: UnitType.Destroyer | UnitType.Battleship): boolean {
        if (!this.random.chance(50)) {
            return false
        }
        const ports = this.player.units(UnitType.Port)
        const ships = this.player.units(shipType)
        if (ports.length > 0 && ships.length == 0 && this.player.gold() > this.cost(shipType)) {
            const port = this.random.randElement(ports)
            const targetTile = this.warshipSpawnTile(port.tile())
            if (targetTile == null) {
                return false
            }
            const canBuild = this.player.canBuild(UnitType.Destroyer, targetTile)
            if (canBuild == false) {
                consolex.warn('cannot spawn destroyer')
                return false
            }
            switch (shipType) {
                case UnitType.Destroyer:
                    this.mg.addExecution(new DestroyerExecution(this.player.id(), targetTile.cell()))
                    break
                case UnitType.Battleship:
                    this.mg.addExecution(new BattleshipExecution(this.player.id(), targetTile.cell()))
                    break
            }
            return true
        }
        return false
    }

    private randTerritoryTile(p: Player): Tile | null {
        const boundingBox = calculateBoundingBox(p.borderTiles())
        for (let i = 0; i < 100; i++) {
            const randX = this.random.nextInt(boundingBox.min.x, boundingBox.max.x)
            const randY = this.random.nextInt(boundingBox.min.y, boundingBox.max.y)
            if (!this.mg.isOnMap(new Cell(randX, randY))) {
                // Sanity check should never happen
                continue
            }
            const randTile = this.mg.tile(new Cell(randX, randY))
            if (randTile.owner() == p) {
                return randTile
            }
        }
        return null
    }

    private warshipSpawnTile(portTile: Tile): Tile | null {
        const radius = this.mg.config().boatMaxDistance() / 2
        for (let attempts = 0; attempts < 50; attempts++) {
            const randX = this.random.nextInt(portTile.cell().x - radius, portTile.cell().x + radius)
            const randY = this.random.nextInt(portTile.cell().y - radius, portTile.cell().y + radius)
            const cell = new Cell(randX, randY)
            if (!this.mg.isOnMap(cell)) {
                continue
            }
            // Sanity check
            if (manhattanDist(cell, portTile.cell()) >= this.mg.config().boatMaxDistance()) {
                continue
            }
            const tile = this.mg.tile(cell)
            if (!tile.isOcean()) {
                continue
            }
            return tile
        }
        return null
    }

    private cost(type: UnitType): number {
        return this.mg.unitInfo(type).cost(this.player)
    }

    handleAllianceRequests() {
        for (const req of this.player.incomingAllianceRequests()) {
            if (req.requestor().isTraitor()) {
                this.replyToAllianceRequest(req, false)
                continue
            }
            if (this.player.relation(req.requestor()) < Relation.Neutral) {
                this.replyToAllianceRequest(req, false)
                continue
            }
            const requestorIsMuchLarger = req.requestor().numTilesOwned() > this.player.numTilesOwned() * 3
            if (!requestorIsMuchLarger && req.requestor().alliances().length >= 3) {
                this.replyToAllianceRequest(req, false)
                continue
            }
            this.replyToAllianceRequest(req, true)
        }
    }

    private replyToAllianceRequest(req: AllianceRequest, accept: boolean): void {
        this.mg.addExecution(
            new AllianceRequestReplyExecution(req.requestor().id(), this.player.id(), accept)
        )
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