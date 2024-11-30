// pathfinding.ts
import { Cell, GameMap, TerrainMap, TerrainTile, TerrainType } from "../game/Game";
import { createMiniMap, loadTerrainMap } from "../game/TerrainMapLoader";
import { PriorityQueue } from "@datastructures-js/priority-queue";
import { SerialAStar } from "../pathfinding/SerialAStar";
import { PathFindResultType, SearchNode } from "../pathfinding/AStar";

let terrainMapPromise: Promise<TerrainMap>;
let searches = new PriorityQueue<Search>((a: Search, b: Search) => (a.deadline - b.deadline))
let processingInterval: number | null = null;
let isProcessingSearch = false

interface Point {
    x: number
    y: number
}

interface Search {
    aStar: SerialAStar,
    deadline: number
    requestId: string,
    end: Point
}

interface SearchRequest {
    requestId: string
    currentTick: number
    // duration in ticks
    duration: number
    start: Point
    end: Point
}

self.onmessage = (e) => {
    switch (e.data.type) {
        case 'init':
            initializeMap(e.data);
            break;
        case 'findPath':
            terrainMapPromise.then(tm => findPath(tm, e.data))
            break;
    }
};

function initializeMap(data: { gameMap: GameMap }) {
    terrainMapPromise = loadTerrainMap(data.gameMap).then(tm => createMiniMap(tm))
    self.postMessage({ type: 'initialized' });
    processingInterval = setInterval(computeSearches, .1) as unknown as number;
}

function findPath(terrainMap: TerrainMap, req: SearchRequest) {
    console.log(`terrain map height: ${terrainMap.height()}`)
    const aStar = new SerialAStar(
        terrainMap.terrain(new Cell(Math.floor(req.start.x / 2), Math.floor(req.start.y / 2))),
        terrainMap.terrain(new Cell(Math.floor(req.end.x / 2), Math.floor(req.end.y / 2))),
        (sn: SearchNode) => (sn as TerrainTile).terrainType() == TerrainType.Ocean,
        (sn: SearchNode): SearchNode[] => terrainMap.neighbors((sn as TerrainTile)),
        10_000,
        req.duration,
    );

    searches.enqueue({
        aStar: aStar,
        deadline: req.currentTick + req.duration,
        requestId: req.requestId,
        end: req.end
    })
}

function computeSearches() {
    if (isProcessingSearch || searches.isEmpty()) {
        return
    }

    isProcessingSearch = true

    try {
        for (let i = 0; i < 10; i++) {
            if (searches.isEmpty()) {
                return
            }
            const search = searches.dequeue()
            switch (search.aStar.compute()) {
                case PathFindResultType.Completed:
                    const path = upscalePath(search.aStar.reconstructPath().map(sn => ({ x: sn.cell().x, y: sn.cell().y })))
                    path.push(search.end)
                    self.postMessage({
                        type: 'pathFound',
                        requestId: search.requestId,
                        path: path
                    });
                    break;

                case PathFindResultType.Pending:
                    searches.push(search)
                    break
                case PathFindResultType.PathNotFound:
                    console.warn(`worker: path not found to port`);
                    self.postMessage({
                        type: 'pathNotFound',
                        requestId: search.requestId,
                    });
                    break
            }
        }
    } finally {
        isProcessingSearch = false
    }
}

function upscalePath(path: Point[], scaleFactor: number = 2): Point[] {
    // Scale up each point
    const scaledPath = path.map(point => ({
        x: point.x * scaleFactor,
        y: point.y * scaleFactor
    }));

    const smoothPath: Point[] = [];

    for (let i = 0; i < scaledPath.length - 1; i++) {
        const current = scaledPath[i];
        const next = scaledPath[i + 1];

        // Add the current point
        smoothPath.push(current);

        // Always interpolate between scaled points
        const dx = next.x - current.x;
        const dy = next.y - current.y;

        // Calculate number of steps needed
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const steps = distance;

        // Add intermediate points
        for (let step = 1; step < steps; step++) {
            smoothPath.push({
                x: Math.round(current.x + (dx * step) / steps),
                y: Math.round(current.y + (dy * step) / steps)
            });
        }
    }

    // Add the last point
    if (scaledPath.length > 0) {
        smoothPath.push(scaledPath[scaledPath.length - 1]);
    }

    return smoothPath;
}
