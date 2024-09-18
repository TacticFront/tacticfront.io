import {MutableBoat, Tile, TerraNullius} from "./Game";
import {GameImpl} from "./GameImpl";
import {PlayerImpl} from "./PlayerImpl";
import {TerraNulliusImpl} from "./TerraNulliusImpl";


export class BoatImpl implements MutableBoat {
    private _active = true;

    constructor(
        private g: GameImpl,
        private _tile: Tile,
        private _troops: number,
        private _owner: PlayerImpl,
        private _target: PlayerImpl | TerraNulliusImpl
    ) { }

    move(tile: Tile): void {
        const oldTile = this._tile;
        this._tile = tile;
        this.g.fireBoatUpdateEvent(this, oldTile);
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
    target(): PlayerImpl | TerraNullius {
        return this._target;
    }
    delete(): void {
        this._owner._boats = this._owner._boats.filter(b => b != this);
        this._active = false;
        this.g.fireBoatUpdateEvent(this, this._tile);
    }
    isActive(): boolean {
        return this._active;
    }
}
