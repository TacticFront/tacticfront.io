import {MutablePlayer, Tile, PlayerInfo, PlayerID, PlayerType, Player, TerraNullius, Cell, MutableGame, Execution, AllianceRequest, MutableAllianceRequest, MutableAlliance} from "./Game";
import {ClientID} from "../Schemas";
import {simpleHash} from "../Util";
import {CellString, GameImpl} from "./GameImpl";
import {BoatImpl} from "./BoatImpl";
import {TileImpl} from "./TileImpl";
import {TerraNulliusImpl} from "./TerraNulliusImpl";
import {threadId} from "worker_threads";


export class PlayerImpl implements MutablePlayer {
    private isTraitor_ = false

    public _borderTiles: Set<Tile> = new Set();

    public _boats: BoatImpl[] = [];
    public _tiles: Map<CellString, Tile> = new Map<CellString, Tile>();

    private _name: string;

    constructor(private gs: GameImpl, private readonly playerInfo: PlayerInfo, private _troops) {
        this._name = playerInfo.name;
    }

    name(): string {
        return this._name;
    }

    clientID(): ClientID {
        return this.playerInfo.clientID;
    }

    id(): PlayerID {
        return this.playerInfo.id;
    }

    type(): PlayerType {
        return this.playerInfo.playerType;
    }

    setName(name: string) {
    }

    addBoat(troops: number, tile: Tile, target: Player | TerraNullius): BoatImpl {
        const b = new BoatImpl(this.gs, tile, troops, this, target as PlayerImpl | TerraNulliusImpl);
        this._boats.push(b);
        this.gs.fireBoatUpdateEvent(b, b.tile());
        return b;
    }

    boats(): BoatImpl[] {
        return this._boats;
    }

    sharesBorderWith(other: Player | TerraNullius): boolean {
        for (const border of this._borderTiles) {
            for (const neighbor of border.neighbors()) {
                if (neighbor.owner() == other) {
                    return true;
                }
            }
        }
        return false;
    }
    numTilesOwned(): number {
        return this._tiles.size;
    }

    tiles(): ReadonlySet<Tile> {
        return new Set(this._tiles.values());
    }

    borderTiles(): ReadonlySet<Tile> {
        return this._borderTiles;
    }

    neighbors(): (MutablePlayer | TerraNullius)[] {
        const ns: Set<(MutablePlayer | TerraNullius)> = new Set();
        for (const border of this.borderTiles()) {
            for (const neighbor of border.neighbors()) {
                if (neighbor.isLand() && neighbor.owner() != this) {
                    ns.add((neighbor as TileImpl)._owner);
                }
            }
        }
        return Array.from(ns);
    }

    addTroops(troops: number): void {
        this._troops += Math.floor(troops);
    }
    removeTroops(troops: number): void {
        this._troops -= Math.floor(troops);
        this._troops = Math.max(this._troops, 0);
    }

    isPlayer(): this is MutablePlayer {return true as const;}
    ownsTile(cell: Cell): boolean {return this._tiles.has(cell.toString());}
    setTroops(troops: number) {this._troops = Math.floor(troops);}
    conquer(tile: Tile) {this.gs.conquer(this, tile);}
    relinquish(tile: Tile) {
        if (tile.owner() != this) {
            throw new Error(`Cannot relinquish tile not owned by this player`);
        }
        this.gs.relinquish(tile);
    }
    info(): PlayerInfo {return this.playerInfo;}
    troops(): number {return this._troops;}
    isAlive(): boolean {return this._tiles.size > 0;}
    executions(): Execution[] {
        return this.gs.executions().filter(exec => exec.owner().id() == this.id());
    }

    incomingAllianceRequests(): MutableAllianceRequest[] {
        return this.gs.allianceRequests.filter(ar => ar.recipient() == this)
    }

    outgoingAllianceRequests(): MutableAllianceRequest[] {
        return this.gs.allianceRequests.filter(ar => ar.requestor() == this)
    }

    alliances(): MutableAlliance[] {
        return this.gs.alliances_.filter(a => a.requestor() == this || a.recipient() == this)
    }

    alliedWith(other: Player): boolean {
        return this.alliances().find(a => a.recipient() == other || a.requestor() == other) != null
    }

    pendingAllianceRequestWith(other: Player): boolean {
        return this.incomingAllianceRequests().find(ar => ar.requestor() == other) != null
            || this.outgoingAllianceRequests().find(ar => ar.recipient() == other) != null

    }

    isTraitor(): boolean {
        return this.isTraitor_
    }

    breakAllianceWith(other: Player): void {
        if (!this.alliedWith(other)) {
            throw new Error('cannot break alliance, already allied')
        }
        this.isTraitor_ = true
        this.gs.breakAlliance(this, other)
    }

    hash(): number {
        return simpleHash(this.id()) * (this.troops() + this.numTilesOwned());
    }
    toString(): string {
        return `Player:{name:${this.info().name},clientID:${this.info().clientID},isAlive:${this.isAlive()},troops:${this._troops},numTileOwned:${this.numTilesOwned()}}]`;
    }
}
