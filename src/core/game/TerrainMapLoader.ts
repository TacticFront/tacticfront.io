import { Cell, GameMap, TerrainType } from './Game';
import europeBin from "!!binary-loader!../../../resources/maps/Europe.bin";
import europeInfo from "../../../resources/maps/Europe.json"

import worldBin from "!!binary-loader!../../../resources/maps/WorldMap.bin";
import worldInfo from "../../../resources/maps/WorldMap.json"

import menaBin from "!!binary-loader!../../../resources/maps/Mena.bin"
import menaInfo from "../../../resources/maps/Mena.json"

const maps = new Map()
    .set(GameMap.World, { bin: worldBin, info: worldInfo })
    .set(GameMap.Europe, { bin: europeBin, info: europeInfo })
    .set(GameMap.Mena, { bin: menaBin, info: menaInfo });

const loadedMaps = new Map<GameMap, TerrainMap>()

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


export class TerrainMap {
    constructor(
        public readonly tiles: Terrain[][],
        public readonly numLandTiles: number,
        public readonly nationMap: NationMap,
        public searchBuffer: SharedArrayBuffer
    ) { }

    terrain(cell: Cell): Terrain {
        return this.tiles[cell.x][cell.y]
    }

    width(): number {
        return this.tiles.length
    }

    height(): number {
        return this.tiles[0].length
    }
}

export class Terrain {
    public shoreline: boolean = false
    public magnitude: number = 0
    public ocean = false
    public land = false
    constructor(public type: TerrainType) { }
}

export async function loadTerrainMap(map: GameMap): Promise<TerrainMap> {
    if (loadedMaps.has(map)) {
        return loadedMaps.get(map)
    }

    const mapData = maps.get(map)

    // Simulate an asynchronous file load
    const fileData = await new Promise<string>((resolve) => {
        setTimeout(() => resolve(mapData.bin), 100);
    });

    console.log(`Loaded data length: ${fileData.length} bytes`);

    // Extract width and height from the first 4 bytes
    const width = (fileData.charCodeAt(1) << 8) | fileData.charCodeAt(0);
    const height = (fileData.charCodeAt(3) << 8) | fileData.charCodeAt(2);

    console.log(`Decoded dimensions: ${width}x${height}`);

    // Check if the data length matches the expected size
    if (fileData.length != width * height + 4) {  // +4 for the width and height bytes
        throw new Error(`Invalid data: buffer size ${fileData.length} incorrect for ${width}x${height} terrain plus 4 bytes for dimensions.`);
    }

    const terrain: Terrain[][] = Array(width).fill(null).map(() => Array(height).fill(null));
    let numLand = 0

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

            terrain[x][y] = new Terrain(type);
            terrain[x][y].shoreline = shoreline;
            terrain[x][y].magnitude = magnitude;
            terrain[x][y].ocean = ocean
            terrain[x][y].land = land
        }
    }
    const encoder = new TextEncoder();
    const encoded = encoder.encode(fileData);
    const buffer = new SharedArrayBuffer(encoded.length);
    const view = new Uint8Array(buffer);
    view.set(encoded)
    const m = new TerrainMap(terrain, numLand, mapData.info, buffer);
    loadedMaps.set(map, m)
    return m
}

function logBinaryAsAscii(data: string, length: number = 8) {
    console.log('Binary data (1 = set bit, 0 = unset bit):');
    for (let i = 0; i < Math.min(length, data.length); i++) {
        let byte = data.charCodeAt(i);
        let byteString = '';
        for (let j = 7; j >= 0; j--) {
            byteString += (byte & (1 << j)) ? '1' : '0';
        }
        console.log(`Byte ${i}: ${byteString}`);
    }
}