import { Cell, TerrainType } from "./Game";

export type TileRef = number;

export interface GameMap {
    ref(x: number, y: number): TileRef

    x(ref: TileRef): number
    y(ref: TileRef): number
    cell(ref: TileRef): Cell
    width(): number
    height(): number
    numLandTiles(): number

    isValidCoord(x: number, y: number): boolean
    // Terrain getters (immutable)
    isLand(ref: TileRef): boolean
    isOceanShore(ref: TileRef): boolean
    isOcean(ref: TileRef): boolean
    isShoreline(ref: TileRef): boolean
    magnitude(ref: TileRef): number
    // State getters and setters (mutable)
    ownerID(ref: TileRef): number
    hasOwner(ref: TileRef): boolean

    setOwnerID(ref: TileRef, playerId: number): void
    hasFallout(ref: TileRef): boolean
    setFallout(ref: TileRef, value: boolean): void
    isBorder(ref: TileRef): boolean
    setBorder(ref: TileRef, value: boolean): void
    neighbors(ref: TileRef): TileRef[]
}

export class GameMapImpl implements GameMap {
    private readonly terrain: Uint8Array;     // Immutable terrain data
    private readonly state: Uint16Array;      // Mutable game state
    private readonly width_: number;
    private readonly height_: number;

    // Terrain bits (Uint8Array)
    private static readonly IS_LAND_BIT = 7;
    private static readonly SHORELINE_BIT = 6;
    private static readonly OCEAN_BIT = 5;
    private static readonly MAGNITUDE_OFFSET = 4;  // Uses bits 3-7 (5 bits)
    private static readonly MAGNITUDE_MASK = 0x1F; // 11111 in binary

    // State bits (Uint16Array)
    private static readonly PLAYER_ID_OFFSET = 0;  // Uses bits 0-11 (12 bits)
    private static readonly PLAYER_ID_MASK = 0xFFF;
    private static readonly FALLOUT_BIT = 12;
    private static readonly BORDER_BIT = 13;
    private static readonly DEFENSE_BONUS_BIT = 14;
    // Bit 15 still reserved

    constructor(width: number, height: number, terrainData: Uint8Array, private numLandTiles_: number) {
        if (terrainData.length !== width * height) {
            throw new Error(`Terrain data length ${terrainData.length} doesn't match dimensions ${width}x${height}`);
        }
        this.width_ = width;
        this.height_ = height;
        this.terrain = terrainData;
        this.state = new Uint16Array(width * height);
    }

    ref(x: number, y: number): TileRef {
        if (!this.isValidCoord(x, y)) {
            throw new Error(`Invalid coordinates: ${x},${y}`);
        }
        return y * this.width_ + x;
    }

    x(ref: TileRef): number {
        return ref % this.width_;
    }

    y(ref: TileRef): number {
        return Math.floor(ref / this.width_);
    }

    cell(ref: TileRef): Cell {
        return new Cell(this.x(ref), this.y(ref))
    }

    width(): number { return this.width_; }
    height(): number { return this.height_; }
    numLandTiles(): number { return this.numLandTiles_; }

    isValidCoord(x: number, y: number): boolean {
        return x >= 0 && x < this.width_ && y >= 0 && y < this.height_;
    }

    // Terrain getters (immutable)
    isLand(ref: TileRef): boolean {
        return Boolean(this.terrain[ref] & (1 << GameMapImpl.IS_LAND_BIT));
    }

    isOceanShore(ref: TileRef): boolean {
        return this.isLand(ref) && this.neighbors(ref).some(tr => this.isOcean(tr))
    }

    isOcean(ref: TileRef): boolean {
        return Boolean(this.terrain[ref] & (1 << GameMapImpl.OCEAN_BIT));
    }

    isShoreline(ref: TileRef): boolean {
        return Boolean(this.terrain[ref] & (1 << GameMapImpl.SHORELINE_BIT));
    }

    magnitude(ref: TileRef): number {
        return this.terrain[ref] & GameMapImpl.MAGNITUDE_MASK;
    }

    // State getters and setters (mutable)
    ownerID(ref: TileRef): number {
        return this.state[ref] & GameMapImpl.PLAYER_ID_MASK;
    }

    hasOwner(ref: TileRef): boolean {
        return this.ownerID(ref) != 0
    }


    setOwnerID(ref: TileRef, playerId: number): void {
        if (playerId > GameMapImpl.PLAYER_ID_MASK) {
            throw new Error(`Player ID ${playerId} exceeds maximum value ${GameMapImpl.PLAYER_ID_MASK}`);
        }
        this.state[ref] = (this.state[ref] & ~GameMapImpl.PLAYER_ID_MASK) | playerId;
    }

    hasFallout(ref: TileRef): boolean {
        return Boolean(this.state[ref] & (1 << GameMapImpl.FALLOUT_BIT));
    }

    setFallout(ref: TileRef, value: boolean): void {
        if (value) {
            this.state[ref] |= 1 << GameMapImpl.FALLOUT_BIT;
        } else {
            this.state[ref] &= ~(1 << GameMapImpl.FALLOUT_BIT);
        }
    }

    isBorder(ref: TileRef): boolean {
        return Boolean(this.state[ref] & (1 << GameMapImpl.BORDER_BIT));
    }

    setBorder(ref: TileRef, value: boolean): void {
        if (value) {
            this.state[ref] |= 1 << GameMapImpl.BORDER_BIT;
        } else {
            this.state[ref] &= ~(1 << GameMapImpl.BORDER_BIT);
        }
    }

    hasDefenseBonus(ref: TileRef): boolean {
        return Boolean(this.state[ref] & (1 << GameMapImpl.DEFENSE_BONUS_BIT));
    }

    setDefenseBonus(ref: TileRef, value: boolean): void {
        if (value) {
            this.state[ref] |= 1 << GameMapImpl.DEFENSE_BONUS_BIT;
        } else {
            this.state[ref] &= ~(1 << GameMapImpl.DEFENSE_BONUS_BIT);
        }
    }

    // Helper methods
    isWater(ref: TileRef): boolean {
        return !this.isLand(ref);
    }

    isLake(ref: TileRef): boolean {
        return !this.isLand(ref) && !this.isOcean(ref);
    }

    isShore(ref: TileRef): boolean {
        return this.isLand(ref) && this.isShoreline(ref);
    }

    cost(ref: TileRef): number {
        return this.magnitude(ref) < 10 ? 2 : 1;
    }

    getTerrainType(ref: TileRef): TerrainType {
        if (this.isLand(ref)) {
            const magnitude = this.magnitude(ref);
            if (magnitude < 10) return TerrainType.Plains;
            if (magnitude < 20) return TerrainType.Highland;
            return TerrainType.Mountain;
        }
        return this.isOcean(ref) ? TerrainType.Ocean : TerrainType.Lake;
    }

    neighbors(ref: TileRef): TileRef[] {
        const neighbors: TileRef[] = [];
        const w = this.width_;

        if (ref >= w) neighbors.push(ref - w);
        if (ref < (this.height_ - 1) * w) neighbors.push(ref + w);
        if (ref % w !== 0) neighbors.push(ref - 1);
        if (ref % w !== w - 1) neighbors.push(ref + 1);

        for (const n of neighbors) {
            (this.ref(this.x(n), this.y(n)))
        }

        return neighbors;
    }
}