import { GameUpdateType, MessageType, UnitUpdate } from './Game';
import { simpleHash, within } from "../Util";
import { Unit, TerraNullius, UnitType, Player, UnitInfo } from "./Game";
import { GameImpl } from "./GameImpl";
import { PlayerImpl } from "./PlayerImpl";
import { TileRef } from './GameMap';


export class UnitImpl implements Unit {
    private _active = true;
    private _health: number
    private _lastTile: TileRef = null

    constructor(
        private _type: UnitType,
        private mg: GameImpl,
        private _tile: TileRef,
        private _troops: number,
        private _id: number,
        public _owner: PlayerImpl,
    ) {
        // default to half health (or 1 is no health specified)
        this._health = (this.mg.unitInfo(_type).maxHealth ?? 2) / 2
        this._lastTile = _tile
    }


    toUpdate(): UnitUpdate {
        return {
            type: GameUpdateType.Unit,
            unitType: this._type,
            id: this._id,
            troops: this._troops,
            ownerID: this._owner.smallID(),
            isActive: this._active,
            pos: { x: this.mg.x(this._tile), y: this.mg.y(this._tile) },
            lastPos: { x: this.mg.x(this._lastTile), y: this.mg.y(this._lastTile) }

        }
    }

    type(): UnitType {
        return this._type
    }

    lastTile(): TileRef {
        return this._lastTile
    }

    move(tile: TileRef): void {
        if (tile == null) {
            throw new Error("tile cannot be null")
        }
        this._lastTile = this._tile
        this._tile = tile;
        this.mg.addUpdate(this.toUpdate());
    }
    setTroops(troops: number): void {
        this._troops = troops;
    }
    troops(): number {
        return this._troops;
    }
    health(): number {
        return this._health
    }
    hasHealth(): boolean {
        return this.info().maxHealth != undefined
    }
    tile(): TileRef {
        return this._tile
    }
    owner(): PlayerImpl {
        return this._owner;
    }

    info(): UnitInfo {
        return this.mg.unitInfo(this._type)
    }

    setOwner(newOwner: Player): void {
        const oldOwner = this._owner
        oldOwner._units = oldOwner._units.filter(u => u != this)
        this._owner = newOwner as PlayerImpl
        this.mg.addUpdate(this.toUpdate())
        this.mg.displayMessage(
            `Your ${this.type()} was captured by ${newOwner.displayName()}`,
            MessageType.ERROR,
            oldOwner.id()
        )
    }

    modifyHealth(delta: number): void {
        this._health = within(
            this._health + delta,
            0,
            this.info().maxHealth ?? 1
        )
    }


    delete(displayMessage: boolean = true): void {
        if (!this.isActive()) {
            throw new Error(`cannot delete ${this} not active`)
        }
        this._owner._units = this._owner._units.filter(b => b != this);
        this._active = false;
        this.mg.addUpdate(this.toUpdate());
        if (displayMessage) {
            this.mg.displayMessage(`Your ${this.type()} was destroyed`, MessageType.ERROR, this.owner().id())
        }
    }
    isActive(): boolean {
        return this._active;
    }

    hash(): number {
        return this.tile() + simpleHash(this.type())
    }

    toString(): string {
        return `Unit:${this._type},owner:${this.owner().name()}`
    }
}
