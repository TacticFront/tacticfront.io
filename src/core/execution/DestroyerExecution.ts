import { Cell, Execution, MutableGame, MutablePlayer, MutableUnit, PlayerID, TerrainType, UnitType } from "../game/Game";
import { PathFinder } from "../pathfinding/PathFinding";
import { PathFindResultType } from "../pathfinding/AStar";
import { PseudoRandom } from "../PseudoRandom";
import { distSort, distSortUnit } from "../Util";
import { consolex } from "../Consolex";
import { TileRef } from "../game/GameMap";

export class DestroyerExecution implements Execution {
    private random: PseudoRandom

    private _owner: MutablePlayer
    private active = true
    private destroyer: MutableUnit = null
    private mg: MutableGame = null

    private target: MutableUnit = null
    private pathfinder: PathFinder

    private patrolTile: TileRef;

    // TODO: put in config
    private searchRange = 100

    constructor(
        private playerID: PlayerID,
        private patrolCenterTile: TileRef,
    ) { }


    init(mg: MutableGame, ticks: number): void {
        this.pathfinder = PathFinder.Mini(mg, 5000, false)
        this._owner = mg.player(this.playerID)
        this.mg = mg
        this.patrolTile = this.patrolCenterTile
        this.random = new PseudoRandom(mg.ticks())
    }

    tick(ticks: number): void {
        if (this.destroyer == null) {
            const spawn = this._owner.canBuild(UnitType.Destroyer, this.patrolTile)
            if (spawn == false) {
                this.active = false
                return
            }
            this.destroyer = this._owner.buildUnit(UnitType.Destroyer, 0, spawn)
            return
        }
        if (!this.destroyer.isActive()) {
            this.active = false
            return
        }
        if (this.target != null && !this.target.isActive()) {
            this.target = null
        }
        if (this.target == null) {
            const ships = this.mg.units(UnitType.TransportShip, UnitType.Destroyer, UnitType.TradeShip, UnitType.Battleship)
                .filter(u => this.mg.manhattanDist(u.tile(), this.destroyer.tile()) < 100)
                .filter(u => u.type() != UnitType.Destroyer || u.health() < this.destroyer.health()) // only attack Destroyers weaker than it.
                .filter(u => u.owner() != this.destroyer.owner())
                .filter(u => u != this.destroyer)
                .filter(u => !u.owner().isAlliedWith(this.destroyer.owner()))
            if (ships.length == 0) {
                const result = this.pathfinder.nextTile(this.destroyer.tile(), this.patrolTile)
                switch (result.type) {
                    case PathFindResultType.Completed:
                        this.patrolTile = this.randomTile()
                        break
                    case PathFindResultType.NextTile:
                        this.destroyer.move(result.tile)
                        break
                    case PathFindResultType.Pending:
                        return
                    case PathFindResultType.PathNotFound:
                        consolex.log(`path not found to patrol tile`)
                        this.patrolTile = this.randomTile()
                        break
                }
                return
            }
            this.target = ships.sort(distSortUnit(this.mg, this.destroyer))[0]
        }
        if (!this.target.isActive() || this.target.owner() == this._owner) {
            // Incase another destroyer captured or destroyed target
            this.target = null
            return
        }

        for (let i = 0; i < 2; i++) {
            const result = this.pathfinder.nextTile(this.destroyer.tile(), this.target.tile(), 5)
            switch (result.type) {
                case PathFindResultType.Completed:
                    switch (this.target.type()) {
                        case UnitType.TransportShip:
                        case UnitType.Battleship:
                            this.target.delete()
                            break
                        case UnitType.TradeShip:
                            this.owner().captureUnit(this.target)
                            break
                        case UnitType.Destroyer:
                            const health = this.target.health()
                            this.target.modifyHealth(-this.destroyer.health())
                            this.destroyer.modifyHealth(-health)
                            break
                    }
                    this.target = null
                    return
                case PathFindResultType.NextTile:
                    this.destroyer.move(result.tile)
                    break
                case PathFindResultType.Pending:
                    break
                case PathFindResultType.PathNotFound:
                    consolex.log(`path not found to target`)
                    break
            }
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