import { Cell, Execution, Game, Player, MutableUnit, PlayerID, TerrainType, Unit, UnitType } from "../game/Game";
import { PathFinder } from "../pathfinding/PathFinding";
import { PathFindResultType } from "../pathfinding/AStar";
import { PseudoRandom } from "../PseudoRandom";
import { distSort, distSortUnit } from "../Util";
import { ShellExecution } from "./ShellExecution";
import { consolex } from "../Consolex";
import { TileRef } from "../game/GameMap";

export class BattleshipExecution implements Execution {
    private random: PseudoRandom

    private _owner: Player
    private active = true
    private battleship: MutableUnit = null
    private mg: Game = null

    private pathfinder: PathFinder

    private patrolTile: TileRef;

    // TODO: put in config
    private searchRange = 100
    private attackRate = 5
    private lastAttack = 0

    private alreadyTargeted = new Set<Unit>()

    constructor(
        private playerID: PlayerID,
        private patrolCenterTile: TileRef,
    ) { }


    init(mg: Game, ticks: number): void {
        this.pathfinder = PathFinder.Mini(mg, 5000, false)
        this._owner = mg.player(this.playerID)
        this.mg = mg
        this.patrolTile = this.patrolCenterTile
        this.random = new PseudoRandom(mg.ticks())
    }

    tick(ticks: number): void {
        this.alreadyTargeted.forEach(u => {
            if (!u.isActive()) {
                this.alreadyTargeted.delete(u)
            }
        })
        if (this.battleship == null) {
            const spawn = this._owner.canBuild(UnitType.Battleship, this.patrolTile)
            if (spawn == false) {
                this.active = false
                return
            }
            this.battleship = this._owner.buildUnit(UnitType.Battleship, 0, spawn)
            return
        }
        if (!this.battleship.isActive()) {
            this.active = false
            return
        }

        if (this.mg.ticks() % 2 == 0) {
            const result = this.pathfinder.nextTile(this.battleship.tile(), this.patrolTile)
            switch (result.type) {
                case PathFindResultType.Completed:
                    this.patrolTile = this.randomTile()
                    break
                case PathFindResultType.NextTile:
                    this.battleship.move(result.tile)
                    break
                case PathFindResultType.Pending:
                    return
                case PathFindResultType.PathNotFound:
                    consolex.log(`path not found to patrol tile`)
                    this.patrolTile = this.randomTile()
                    break
            }
        }

        if (this.mg.ticks() - this.lastAttack < this.attackRate) {
            return
        }

        let ships = this.mg.units(UnitType.TransportShip, UnitType.Destroyer, UnitType.TradeShip, UnitType.Battleship)
            .filter(u => this.mg.manhattanDist(u.tile(), this.battleship.tile()) < 100)
            .filter(u => u.owner() != this.battleship.owner())
            .filter(u => u != this.battleship)
            .filter(u => !u.owner().isAlliedWith(this.battleship.owner()))
            .filter(u => !this.alreadyTargeted.has(u))
            .sort(distSortUnit(this.mg, this.battleship));

        const friendlyDestroyerNearby = this.battleship.owner().units(UnitType.Destroyer)
            .filter(d => this.mg.manhattanDist(d.tile(), this.battleship.tile()) < 120)
            .length > 0

        if (friendlyDestroyerNearby) {
            // Don't attack trade ships to allow friendly destroyer to capture them
            ships = ships.filter(s => s.type() != UnitType.TradeShip)
        }

        if (ships.length > 0) {
            const toAttack = ships[0]
            if (!toAttack.hasHealth()) {
                // Don't send multiple shells to target if it can be one-shotted.
                this.alreadyTargeted.add(toAttack)
            }
            this.lastAttack = this.mg.ticks()
            this.mg.addExecution(new ShellExecution(this.battleship.tile(), this.battleship.owner(), this.battleship, toAttack))
        }
    }

    owner(): Player {
        return this._owner
    }

    isActive(): boolean {
        return this.active
    }

    activeDuringSpawnPhase(): boolean {
        return false
    }

    randomTile(): TileRef {
        while (true) {
            const x = this.mg.x(this.patrolCenterTile) + this.random.nextInt(-this.searchRange / 2, this.searchRange / 2)
            const y = this.mg.y(this.patrolCenterTile) + this.random.nextInt(-this.searchRange / 2, this.searchRange / 2)
            if (!this.mg.isValidCoord(x, y)) {
                continue
            }
            const tile = this.mg.ref(x, y)
            if (!this.mg.isOcean(tile)) {
                continue
            }
            return tile
        }
    }

}