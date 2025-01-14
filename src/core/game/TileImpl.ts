import { Tile, Cell, TerrainType, Player, TerraNullius, MutablePlayer, TerrainTile, DefenseBonus, MutableTile, TileUpdate, GameUpdateType } from "./Game";
import { TerrainMapImpl, TerrainTileImpl } from "./TerrainMapLoader";
import { GameImpl } from "./GameImpl";
import { PlayerImpl } from "./PlayerImpl";
import { TerraNulliusImpl } from "./TerraNulliusImpl";


export class TileImpl implements MutableTile {

    public _isBorder = false;
    private _neighbors: Tile[] = null;

    public _defenseBonuses: DefenseBonus[] = []

    public _hasFallout = false

    constructor(
        private readonly gs: GameImpl,
        public _owner: PlayerImpl | TerraNulliusImpl,
        private readonly _cell: Cell,
        private terrainMap: TerrainMapImpl
    ) { }

    toUpdate(): TileUpdate {
        return {
            type: GameUpdateType.Tile,
            pos: {
                x: this._cell.x,
                y: this._cell.y
            },
            ownerID: this._owner.isPlayer() ? this._owner.smallID() : 0,
            hasFallout: this._hasFallout,
            hasDefenseBonus: this.hasDefenseBonus(),
            isBorder: this.isBorder(),
        }
    }

    hasFallout(): boolean {
        return this._hasFallout
    }

    type(): TerrainType {
        return this.terrainMap.terrain(this._cell)._type
    }

    hasDefenseBonus(): boolean {
        return this.defenseBonuses.length > 0
    }

    defenseBonus(player: Player): number {
        if (this.owner() == player) {
            throw Error(`cannot get defense bonus of tile already owned by player, ${player}`)
        }
        let bonusAmount = 0
        for (const bonus of this._defenseBonuses) {
            if (bonus.unit.owner() != player) {
                bonusAmount += bonus.amount
            }
        }
        return Math.max(bonusAmount, 1)
    }

    defenseBonuses(): DefenseBonus[] {
        return this._defenseBonuses
    }

    neighborsWrapped(): Tile[] {
        const x = this._cell.x;
        const y = this._cell.y;
        const ns: Tile[] = [];

        // Check top neighbor
        if (y > 0) {
            ns.push(this.gs.map[x][y - 1]);
        }

        // Check bottom neighbor
        if (y < this.gs.height() - 1) {
            ns.push(this.gs.map[x][y + 1]);
        }

        // Check left neighbor (wrap around)
        if (x > 0) {
            ns.push(this.gs.map[x - 1][y]);
        } else {
            ns.push(this.gs.map[this.gs.width() - 1][y]);
        }

        // Check right neighbor (wrap around)
        if (x < this.gs.width() - 1) {
            ns.push(this.gs.map[x + 1][y]);
        } else {
            ns.push(this.gs.map[0][y]);
        }
        return ns;
    }
    terrain(): TerrainTile {
        return this.terrainMap.terrain(this._cell)
    }

    borders(other: Player | TerraNullius): boolean {
        for (const n of this.neighbors()) {
            if (n.owner() == other) {
                return true;
            }
        }
        return false;
    }

    hasOwner(): boolean { return this._owner != this.gs._terraNullius; }
    owner(): MutablePlayer | TerraNullius { return this._owner; }
    isBorder(): boolean { return this._isBorder; }
    cell(): Cell { return this._cell; }
    x(): number {
        return this._cell.x
    }
    y(): number {
        return this._cell.y
    }

    neighbors(): Tile[] {
        if (this._neighbors == null) {
            this._neighbors = this.gs.neighbors(this);
        }
        return this._neighbors;
    }

    cost(): number {
        return this.terrain().magnitude() < 10 ? 2 : 1
    };
}
