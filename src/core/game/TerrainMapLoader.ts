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
    public magnitude: number = 0
    public ocean = false
    public land = false
    private _neighbors: TerrainTile[] | null = null

    constructor(private map: TerrainMap, public type: TerrainType, private _cell: Cell) { }

    terrainType(): TerrainType {
        return this.type
    }

    cost(): number {
        return this.magnitude < 10 ? 2 : 1
    }

    cell(): Cell {
        return this._cell
    }

    neighbors(): TerrainTile[] {
        if (this._neighbors === null) {
            const positions = [
                { x: this._cell.x - 1, y: this._cell.y }, // Left
                { x: this._cell.x + 1, y: this._cell.y }, // Right
                { x: this._cell.x, y: this._cell.y - 1 }, // Up
                { x: this._cell.x, y: this._cell.y + 1 }  // Down
            ];

            this._neighbors = positions
                .filter(pos => pos.x >= 0 && pos.x < this.map.width() &&
                    pos.y >= 0 && pos.y < this.map.height())
                .map(pos => this.map.terrain(new Cell(pos.x, pos.y)));
        }
        return this._neighbors;
    }
}

export class TerrainMapImpl implements TerrainMap {
    public tiles: TerrainTileImpl[][]
    public numLandTiles: number
    public nationMap: NationMap
    constructor(
    ) { }

    neighbors(terrainTile: TerrainTile): TerrainTile[] {
        return (terrainTile as TerrainTileImpl).neighbors();
    }

    terrain(cell: Cell): TerrainTileImpl {
        return this.tiles[cell.x][cell.y]
    }

    width(): number {
        return this.tiles.length
    }

    height(): number {
        return this.tiles[0].length
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


    consolex.log(`Loaded data length: ${fileData.length} bytes`);

    // Extract width and height from the first 4 bytes
    const width = (fileData.charCodeAt(1) << 8) | fileData.charCodeAt(0);
    const height = (fileData.charCodeAt(3) << 8) | fileData.charCodeAt(2);

    consolex.log(`Decoded dimensions: ${width}x${height}`);

    // Check if the data length matches the expected size
    if (fileData.length != width * height + 4) {  // +4 for the width and height bytes
        throw new Error(`Invalid data: buffer size ${fileData.length} incorrect for ${width}x${height} terrain plus 4 bytes for dimensions.`);
    }

    const terrain: TerrainTileImpl[][] = Array(width).fill(null).map(() => Array(height).fill(null));
    let numLand = 0

    const m = new TerrainMapImpl();

    // Start from the 5th byte (index 4) when processing terrain data
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const packedByte = fileData.charCodeAt(4 + y * width + x);  // +4 to skip dimension bytes
            const isLand = (packedByte & 0b10000000)
            const shoreline = !!(packedByte & 0b01000000);
            const ocean = !!(packedByte & 0b00100000);
            const magnitude = packedByte & 0b00011111;

            let type: TerrainType = null
            let land = false
            if (isLand) {
                numLand++
                land = true
                if (magnitude < 10) {
                    type = TerrainType.Plains
                } else if (magnitude < 20) {
                    type = TerrainType.Highland
                } else {
                    type = TerrainType.Mountain
                }
            } else {
                if (ocean) {
                    type = TerrainType.Ocean
                } else {
                    type = TerrainType.Lake
                }
            }

            terrain[x][y] = new TerrainTileImpl(m, type, new Cell(x, y));
            terrain[x][y].shoreline = shoreline;
            terrain[x][y].magnitude = magnitude;
            terrain[x][y].ocean = ocean
            terrain[x][y].land = land
        }
    }
    m.tiles = terrain
    m.numLandTiles = numLand
    return m
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