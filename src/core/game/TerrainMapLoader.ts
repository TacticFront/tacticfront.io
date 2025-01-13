import { consolex } from '../Consolex';
import { Cell, GameMap, TerrainMap, TerrainTile, TerrainType } from './Game';
import { terrainMapFileLoader } from './TerrainMapFileLoader';

const loadedMaps = new Map<GameMap, { map: TerrainMapImpl, miniMap: TerrainMapImpl }>()

export interface NationMap {
    name: string;
    width: number;
    height: number;
    nations: Nation[];
}

export interface Nation {
    coordinates: [number, number];
    name: string;
    strength: number;
}


export class TerrainTileImpl implements TerrainTile {
    public shoreline: boolean = false
    public _magnitude: number = 0
    public ocean = false
    public land = false

    constructor(private map: TerrainMap, public _type: TerrainType, private _cell: Cell) { }
    type(): TerrainType {
        return this._type
    }
    isLake(): boolean {
        return !this.isLand() && !this.isOcean();
    }
    isOcean(): boolean {
        return this.ocean;
    }
    magnitude(): number {
        return this._magnitude;
    }
    isShore(): boolean {
        return this.isLand() && this.shoreline;
    }
    isOceanShore(): boolean {
        return this.isShore() && this.neighbors().filter(n => n.isOcean()).length > -1;
    }
    isShorelineWater(): boolean {
        return this.isWater() && this.shoreline;
    }
    isLand(): boolean {
        return this.land;
    }
    isWater(): boolean {
        return !this.land;
    }
    cost(): number {
        return this._magnitude < 10 ? 2 : 1
    }

    cell(): Cell {
        return this._cell
    }

    neighbors(): TerrainTile[] {
        const positions = [
            { x: this._cell.x - 1, y: this._cell.y }, // Left
            { x: this._cell.x + 1, y: this._cell.y }, // Right
            { x: this._cell.x, y: this._cell.y - 1 }, // Up
            { x: this._cell.x, y: this._cell.y + 1 }  // Down
        ];

        return positions
            .filter(pos => pos.x >= 0 && pos.x < this.map.width() &&
                pos.y >= 0 && pos.y < this.map.height())
            .map(pos => this.map.terrain(new Cell(pos.x, pos.y)));
    }
}

export class TerrainMapImpl implements TerrainMap {
    public rawData: Uint8Array;
    public width_: number;
    public height_: number;
    public _numLandTiles: number;
    public nationMap: NationMap;


    constructor() { }

    terrain(cell: Cell): TerrainTileImpl {

        const idx = cell.y * this.width_ + cell.x;
        const packedByte = this.rawData[idx];

        const isLand: boolean = (packedByte & 0b10000000) !== 0;
        const shoreline = !!(packedByte & 0b01000000);
        const ocean = !!(packedByte & 0b00100000);
        const magnitude = packedByte & 0b00011111;

        let type: TerrainType;
        if (isLand) {
            if (magnitude < 10) {
                type = TerrainType.Plains;
            } else if (magnitude < 20) {
                type = TerrainType.Highland;
            } else {
                type = TerrainType.Mountain;
            }
        } else {
            type = ocean ? TerrainType.Ocean : TerrainType.Lake;
        }

        const tile = new TerrainTileImpl(this, type, cell);
        tile.shoreline = shoreline;
        tile._magnitude = magnitude;
        tile.ocean = ocean;
        tile.land = isLand;

        return tile;
    }

    isOnMap(cell: Cell): boolean {
        return cell.x >= 0 && cell.x < this.width_ &&
            cell.y >= 0 && cell.y < this.height_;
    }

    width(): number {
        return this.width_;
    }

    height(): number {
        return this.height_;
    }

    numLandTiles(): number {
        return this._numLandTiles;
    }

    neighbors(terrainTile: TerrainTile): TerrainTile[] {
        return (terrainTile as TerrainTileImpl).neighbors();
    }
}


export async function loadTerrainMap(map: GameMap): Promise<{ map: TerrainMapImpl, miniMap: TerrainMapImpl }> {
    if (loadedMaps.has(map)) {
        return loadedMaps.get(map)
    }
    const mapFiles = await terrainMapFileLoader.getMapData(map)

    const mainMap = await loadTerrainFromFile(mapFiles.mapBin)
    mainMap.nationMap = mapFiles.nationMap
    const mini = await loadTerrainFromFile(mapFiles.miniMapBin)
    loadedMaps.set(map, { map: mainMap, miniMap: mini })
    return { map: mainMap, miniMap: mini }
}

export async function loadTerrainFromFile(fileData: string): Promise<TerrainMapImpl> {
    const width = (fileData.charCodeAt(1) << 8) | fileData.charCodeAt(0);
    const height = (fileData.charCodeAt(3) << 8) | fileData.charCodeAt(2);

    if (fileData.length != width * height + 4) {
        throw new Error(`Invalid data: buffer size ${fileData.length} incorrect for ${width}x${height} terrain plus 4 bytes for dimensions.`);
    }

    const m = new TerrainMapImpl();
    m.width_ = width;
    m.height_ = height;

    // Store raw data in Uint8Array
    m.rawData = new Uint8Array(width * height);
    let numLand = 0;

    // Copy data starting after the header
    for (let i = 0; i < width * height; i++) {
        const packedByte = fileData.charCodeAt(i + 4);
        m.rawData[i] = packedByte;
        if (packedByte & 0b10000000) numLand++;
    }

    m._numLandTiles = numLand;
    return m;
}


function logBinaryAsAscii(data: string, length: number = 8) {
    consolex.log('Binary data (1 = set bit, 0 = unset bit):');
    for (let i = 0; i < Math.min(length, data.length); i++) {
        let byte = data.charCodeAt(i);
        let byteString = '';
        for (let j = 7; j >= 0; j--) {
            byteString += (byte & (1 << j)) ? '1' : '0';
        }
        consolex.log(`Byte ${i}: ${byteString}`);
    }
}