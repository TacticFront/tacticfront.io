import { Tile, Cell, TerrainType, Player, TerraNullius, MutablePlayer, TerrainTile, DefenseBonus, MutableTile, TileUpdate, GameUpdateType, TerrainTileKey } from "./Game";
import { TerrainMapImpl, TerrainTileImpl } from "./TerrainMapLoader";
import { GameImpl } from "./GameImpl";
import { PlayerImpl } from "./PlayerImpl";
import { TerraNulliusImpl } from "./TerraNulliusImpl";
import { GameMap, TileRef } from "./GameMap";


export class TileImpl implements MutableTile {


    constructor(
        private readonly gs: GameImpl,
        private ref_: TileRef
    ) { }
    terrain(): TerrainTile {
        return new TerrainRef(this.gs.map(), this.ref_)
    }

    neighborsWrapped(): Tile[] {
        // TODO: implement!
        return this.neighbors()
    }

    ref(): TileRef {
        return this.ref_
    }

    toUpdate(): TileUpdate {
        return {
            type: GameUpdateType.Tile,
            pos: {
                x: this.x(),
                y: this.y()
            },
            ownerID: this.owner().smallID(),
            hasFallout: this.hasFallout(),
            hasDefenseBonus: this.hasDefenseBonus(),
            isBorder: this.isBorder(),
        }
    }

    hasFallout(): boolean {
        return this.gs.map().hasFallout(this.ref_)
    }

    type(): TerrainType {
        return this.gs.map().getTerrainType(this.ref_)
    }

    hasDefenseBonus(): boolean {
        return this.defenseBonuses.length > 0
    }

    defenseBonus(player: Player): number {
        // TODO!
        return 0
        // if (this.owner() == player) {
        //     throw Error(`cannot get defense bonus of tile already owned by player, ${player}`)
        // }
        // let bonusAmount = 0
        // for (const bonus of this._defenseBonuses) {
        //     if (bonus.unit.owner() != player) {
        //         bonusAmount += bonus.amount
        //     }
        // }
        // return Math.max(bonusAmount, 1)
    }

    defenseBonuses(): DefenseBonus[] {
        // TODO!
        return []
    }

    borders(other: Player | TerraNullius): boolean {
        for (const n of this.neighbors()) {
            if (n.owner() == other) {
                return true;
            }
        }
        return false;
    }

    hasOwner(): boolean { return this.owner().smallID() != 0 }

    owner(): MutablePlayer | TerraNullius {
        const ownerID = this.gs.map().ownerID(this.ref_)
        if (ownerID == 0) {
            return this.gs.terraNullius()
        }
        return this.gs.playerBySmallID(ownerID) as MutablePlayer
    }
    isBorder(): boolean { return this.gs.map().isBorder(this.ref_); }

    cell(): Cell { return new Cell(this.x(), this.y()); }

    x(): number {
        return this.gs.map().x(this.ref_)
    }
    y(): number {
        return this.gs.map().y(this.ref_)
    }

    neighbors(): Tile[] {
        return this.gs.neighbors(this)
    }

}

export class TerrainRef implements TerrainTile {

    constructor(private map: GameMap, private ref: TileRef) { }

    isLand(): boolean {
        return this.map.isLand(this.ref)
    }
    isShore(): boolean {
        return this.map.isShore(this.ref)
    }

    isOceanShore(): boolean {
        return this.isShore() && this.neighbors().filter(n => n.isOcean()).length > 0;
    }

    isWater(): boolean {
        return !this.map.isLand(this.ref)
    }
    isShorelineWater(): boolean {
        return this.isWater() && this.isShore()
    }
    isOcean(): boolean {
        return this.map.isOcean(this.ref)
    }
    isLake(): boolean {
        return this.isWater() && !this.isOcean()
    }
    type(): TerrainType {
        return this.map.getTerrainType(this.ref)
    }
    magnitude(): number {
        return this.map.magnitude(this.ref)
    }
    equals(other: TerrainTile): boolean {
        return this.ref == (other as TerrainRef).ref
    }
    cell(): Cell {
        return this.map.cell(this.ref)
    }
    neighbors(): TerrainTile[] {
        return this.map.neighbors(this.ref).map(tr => new TerrainRef(this.map, tr))
    }
    cost(): number {
        return this.map.cost(this.ref)
    }

}