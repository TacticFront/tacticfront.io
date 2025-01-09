import { GameUpdateType, MessageType, UnitUpdate } from './Game';
import { simpleHash, within } from "../Util";
import { MutableUnit, Tile, TerraNullius, UnitType, Player, UnitInfo } from "./Game";
import { GameImpl } from "./GameImpl";
import { PlayerImpl } from "./PlayerImpl";


export class UnitImpl implements MutableUnit {
    private _active = true;
    private _health: number
    private _lastTile: Tile = null

    constructor(
        private _type: UnitType,
        private g: GameImpl,
        private _tile: Tile,
        private _troops: number,
        private _id: number,
        public _owner: PlayerImpl,
    ) {
        // default to half health (or 1 is no health specified)
        this._health = (this.g.unitInfo(_type).maxHealth ?? 2) / 2
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
            pos: this._tile.cell().pos(),
            lastPos: this._lastTile.cell().pos()
        }
    }

    type(): UnitType {
        return this._type
    }

    lastTile(): Tile {
        return this._lastTile
    }

    move(tile: Tile): void {
        if (tile == null) {
            throw new Error("tile cannot be null")
        }
        this._lastTile = this._tile
        this._tile = tile;
        this.g.fireUnitUpdateEvent(this);
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
    tile(): Tile {
        return this._tile;
    }
    owner(): PlayerImpl {
        return this._owner;
    }

    info(): UnitInfo {
        return this.g.unitInfo(this._type)
    }

    setOwner(newOwner: Player): void {
        const oldOwner = this._owner
        oldOwner._units = oldOwner._units.filter(u => u != this)
        this._owner = newOwner as PlayerImpl
        this.g.fireUnitUpdateEvent(this)
        this.g.displayMessage(
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
        this.g.fireUnitUpdateEvent(this);
        if (displayMessage) {
            this.g.displayMessage(`Your ${this.type()} was destroyed`, MessageType.ERROR, this.owner().id())
        }
    }
    isActive(): boolean {
        return this._active;
    }

    hash(): number {
        return this.tile().cell().x + this.tile().cell().y + simpleHash(this.type())
    }

    toString(): string {
        return `Unit:${this._type},owner:${this.owner().name()}`
    }
}
