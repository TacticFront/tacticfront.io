import { Cell, Execution, MutableGame, MutablePlayer, MutableUnit, PlayerID, TerrainType, Tile, Unit, UnitType } from "../game/Game";
import { PathFinder } from "../pathfinding/PathFinding";
import { PathFindResultType } from "../pathfinding/AStar";
import { SerialAStar } from "../pathfinding/SerialAStar";
import { PseudoRandom } from "../PseudoRandom";
import { distSort, distSortUnit, manhattanDist } from "../Util";
import { ShellExecution } from "./ShellExecution";
import { consolex } from "../Consolex";

export class BattleshipExecution implements Execution {
    private random: PseudoRandom

    private _owner: MutablePlayer
    private active = true
    private battleship: MutableUnit = null
    private mg: MutableGame = null

    private pathfinder: PathFinder

    private patrolTile: Tile;
    private patrolCenterTile: Tile

    // TODO: put in config
    private searchRange = 100
    private attackRate = 5
    private lastAttack = 0

    private alreadyTargeted = new Set<Unit>()

    constructor(
        private playerID: PlayerID,
        private cell: Cell,
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this.pathfinder = PathFinder.Mini(mg, 5000, t => t.terrainType() == TerrainType.Ocean)
        this._owner = mg.player(this.playerID)
        this.mg = mg
        this.patrolCenterTile = mg.tile(this.cell)
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
            .filter(u => manhattanDist(u.tile().cell(), this.battleship.tile().cell()) < 100)
            .filter(u => u.owner() != this.battleship.owner())
            .filter(u => u != this.battleship)
            .filter(u => !u.owner().isAlliedWith(this.battleship.owner()))
            .filter(u => !this.alreadyTargeted.has(u))
            .sort(distSortUnit(this.battleship));

        const friendlyDestroyerNearby = this.battleship.owner().units(UnitType.Destroyer)
            .filter(d => manhattanDist(d.tile().cell(), this.battleship.tile().cell()) < 120)
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

    owner(): MutablePlayer {
        return this._owner
    }

    isActive(): boolean {
        return this.active
    }

    activeDuringSpawnPhase(): boolean {
        return false
    }

    randomTile(): Tile {
        while (true) {
            const x = this.patrolCenterTile.cell().x + this.random.nextInt(-this.searchRange / 2, this.searchRange / 2)
            const y = this.patrolCenterTile.cell().y + this.random.nextInt(-this.searchRange / 2, this.searchRange / 2)
            const cell = new Cell(x, y)
            if (!this.mg.isOnMap(cell)) {
                continue
            }
            const tile = this.mg.tile(cell)
            if (!tile.isOcean()) {
                continue
            }
            return tile
        }
    }

}