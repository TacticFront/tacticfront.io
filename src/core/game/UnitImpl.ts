import { MutableUnit, Tile, TerraNullius, UnitType, Player } from "./Game";
import { GameImpl } from "./GameImpl";
import { PlayerImpl } from "./PlayerImpl";
import { TerraNulliusImpl } from "./TerraNulliusImpl";


export class UnitImpl implements MutableUnit {
    private _active = true;

    constructor(
        private _type: UnitType,
        private g: GameImpl,
        private _tile: Tile,
        private _troops: number,
        private _owner: PlayerImpl,
    ) { }

    type(): UnitType {
        return this._type
    }

    move(tile: Tile): void {
        const oldTile = this._tile;
        this._tile = tile;
        this.g.fireUnitUpdateEvent(this, oldTile);
    }
    setTroops(troops: number): void {
        this._troops = troops;
    }
    troops(): number {
        return this._troops;
    }
    tile(): Tile {
        return this._tile;
    }
    owner(): PlayerImpl {
        return this._owner;
    }

    setOwner(newOwner: Player): void {
        this._owner = newOwner as PlayerImpl
        this.g.fireUnitUpdateEvent(this, this.tile())
    }

    delete(): void {
        this._owner._units = this._owner._units.filter(b => b != this);
        this._active = false;
        this.g.fireUnitUpdateEvent(this, this._tile);
    }
    isActive(): boolean {
        return this._active;
    }
}
