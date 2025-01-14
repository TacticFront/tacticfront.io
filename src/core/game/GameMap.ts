import { TerrainType } from "./Game";

export type TileRef = number;

export class GameMap {
    private tiles: bigint[] = [];
    private width_: number;
    private height_: number;
    private numLandTiles_: number = 0;

    // Bit positions for tile data
    private static readonly FALLOUT_BIT = 0n;
    private static readonly OCEAN_BIT = 1n;
    private static readonly SHORELINE_BIT = 2n;
    private static readonly IS_LAND_BIT = 3n;
    private static readonly IS_BORDER_BIT = 4n;
    private static readonly HAS_DEFENSE_BONUS_BIT = 5n;

    private static readonly MAGNITUDE_OFFSET = 8n;
    private static readonly MAGNITUDE_BITS = 5n;
    private static readonly MAGNITUDE_MASK = (1n << GameMap.MAGNITUDE_BITS) - 1n;

    private static readonly PLAYER_ID_OFFSET = 13n;
    private static readonly PLAYER_ID_BITS = 12n;
    private static readonly PLAYER_ID_MASK = (1n << GameMap.PLAYER_ID_BITS) - 1n;

    private static readonly X_COORD_OFFSET = 25n;
    private static readonly X_COORD_BITS = 12n;
    private static readonly X_COORD_MASK = (1n << GameMap.X_COORD_BITS) - 1n;

    private static readonly Y_COORD_OFFSET = 37n;
    private static readonly Y_COORD_BITS = 12n;
    private static readonly Y_COORD_MASK = (1n << GameMap.Y_COORD_BITS) - 1n;

    constructor(width: number, height: number) {
        this.width_ = width;
        this.height_ = height;
        this.tiles = new Array(width * height).fill(0n);
    }

    // Get reference from coordinates
    ref(x: number, y: number): TileRef {
        if (!this.isValidCoord(x, y)) {
            throw new Error(`Invalid coordinates: ${x},${y}`);
        }
        return y * this.width_ + x;
    }

    // Basic properties
    width(): number { return this.width_; }
    height(): number { return this.height_; }
    numLandTiles(): number { return this.numLandTiles_; }

    // Coordinate validation
    isValidCoord(x: number, y: number): boolean {
        return x >= 0 && x < this.width_ && y >= 0 && y < this.height_;
    }

    // Get coordinates from reference
    x(ref: TileRef): number {
        return Number((this.tiles[ref] >> GameMap.X_COORD_OFFSET) & GameMap.X_COORD_MASK);
    }

    y(ref: TileRef): number {
        return Number((this.tiles[ref] >> GameMap.Y_COORD_OFFSET) & GameMap.Y_COORD_MASK);
    }

    // Tile property getters
    playerId(ref: TileRef): number {
        return Number((this.tiles[ref] >> GameMap.PLAYER_ID_OFFSET) & GameMap.PLAYER_ID_MASK);
    }

    magnitude(ref: TileRef): number {
        return Number((this.tiles[ref] >> GameMap.MAGNITUDE_OFFSET) & GameMap.MAGNITUDE_MASK);
    }

    isLand(ref: TileRef): boolean {
        return Boolean(this.tiles[ref] & (1n << GameMap.IS_LAND_BIT));
    }

    isOcean(ref: TileRef): boolean {
        return Boolean(this.tiles[ref] & (1n << GameMap.OCEAN_BIT));
    }

    isShoreline(ref: TileRef): boolean {
        return Boolean(this.tiles[ref] & (1n << GameMap.SHORELINE_BIT));
    }

    hasFallout(ref: TileRef): boolean {
        return Boolean(this.tiles[ref] & (1n << GameMap.FALLOUT_BIT));
    }

    isBorder(ref: TileRef): boolean {
        return Boolean(this.tiles[ref] & (1n << GameMap.IS_BORDER_BIT));
    }

    hasDefenseBonus(ref: TileRef): boolean {
        return Boolean(this.tiles[ref] & (1n << GameMap.HAS_DEFENSE_BONUS_BIT));
    }

    // Tile property setters
    setFallout(ref: TileRef, value: boolean): void {
        if (value) {
            this.tiles[ref] |= 1n << GameMap.FALLOUT_BIT;
        } else {
            this.tiles[ref] &= ~(1n << GameMap.FALLOUT_BIT);
        }
    }

    setBorder(ref: TileRef, value: boolean): void {
        if (value) {
            this.tiles[ref] |= 1n << GameMap.IS_BORDER_BIT;
        } else {
            this.tiles[ref] &= ~(1n << GameMap.IS_BORDER_BIT);
        }
    }

    setPlayerId(ref: TileRef, playerId: number): void {
        const mask = GameMap.PLAYER_ID_MASK << GameMap.PLAYER_ID_OFFSET;
        this.tiles[ref] = (this.tiles[ref] & ~mask) |
            ((BigInt(playerId) & GameMap.PLAYER_ID_MASK) << GameMap.PLAYER_ID_OFFSET);
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

    // Get neighboring tiles
    neighbors(ref: TileRef): TileRef[] {
        const x = this.x(ref);
        const y = this.y(ref);

        return [
            { x: x - 1, y },
            { x: x + 1, y },
            { x, y: y - 1 },
            { x, y: y + 1 }
        ]
            .filter(pos => this.isValidCoord(pos.x, pos.y))
            .map(pos => this.ref(pos.x, pos.y));
    }

    // Method to set initial tile data
    setTile(
        ref: TileRef,
        x: number,
        y: number,
        playerId: number,
        magnitude: number,
        isLand: boolean = false,
        isOcean: boolean = false,
        hasFallout: boolean = false,
        isShoreline: boolean = false,
        isBorder: boolean = false,
        hasDefenseBonus: boolean = false
    ): void {
        let tile = 0n;

        // Set coordinates
        tile |= (BigInt(x) & GameMap.X_COORD_MASK) << GameMap.X_COORD_OFFSET;
        tile |= (BigInt(y) & GameMap.Y_COORD_MASK) << GameMap.Y_COORD_OFFSET;

        // Set player ID
        tile |= (BigInt(playerId) & GameMap.PLAYER_ID_MASK) << GameMap.PLAYER_ID_OFFSET;

        // Set magnitude
        tile |= (BigInt(magnitude) & GameMap.MAGNITUDE_MASK) << GameMap.MAGNITUDE_OFFSET;

        // Set boolean flags
        if (hasFallout) tile |= 1n << GameMap.FALLOUT_BIT;
        if (isOcean) tile |= 1n << GameMap.OCEAN_BIT;
        if (isShoreline) tile |= 1n << GameMap.SHORELINE_BIT;
        if (isLand) {
            tile |= 1n << GameMap.IS_LAND_BIT;
            this.numLandTiles_++;
        }
        if (isBorder) tile |= 1n << GameMap.IS_BORDER_BIT;
        if (hasDefenseBonus) tile |= 1n << GameMap.HAS_DEFENSE_BONUS_BIT;

        this.tiles[ref] = tile;
    }
}

export function createGameMap(width: number, height: number): GameMap {
    return new GameMap(width, height);
}