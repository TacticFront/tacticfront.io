// pathfinding.ts
import { Cell, GameMap, TerrainMap, TerrainTile, TerrainType } from "../game/Game";
import { SearchNode } from "./AStar";
import { PathFindResultType } from "./AStar";
import { SerialAStar } from "./SerialAStar";
import { loadTerrainMap } from "../game/TerrainMapLoader";
import { PriorityQueue } from "@datastructures-js/priority-queue";

let terrainMapPromise: Promise<TerrainMap>;
let searches = new PriorityQueue<Search>((a: Search, b: Search) => (a.deadline - b.deadline))
let processingInterval: number | null = null;
let isProcessingSearch = false


interface Search {
    aStar: SerialAStar,
    deadline: number
    requestId: string
}

interface SearchRequest {
    requestId: string
    currentTick: number
    // duration in ticks
    duration: number
    start: { x: number, y: number },
    end: { x: number, y: number }
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
    terrainMapPromise = loadTerrainMap(data.gameMap)
    self.postMessage({ type: 'initialized' });
    processingInterval = setInterval(computeSearches, .1) as unknown as number;
}

function findPath(terrainMap: TerrainMap, req: SearchRequest) {
    const aStar = new SerialAStar(
        terrainMap.terrain(new Cell(req.start.x, req.start.y)),
        terrainMap.terrain(new Cell(req.end.x, req.end.y)),
        (sn: SearchNode) => (sn as TerrainTile).terrainType() == TerrainType.Ocean,
        (sn: SearchNode): SearchNode[] => terrainMap.neighbors((sn as TerrainTile)),
        10_000,
        req.duration,
    );

    searches.enqueue({
        aStar: aStar,
        deadline: req.currentTick + req.duration,
        requestId: req.requestId
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
                    self.postMessage({
                        type: 'pathFound',
                        requestId: search.requestId,
                        path: search.aStar.reconstructPath().map(sn => ({ x: sn.cell().x, y: sn.cell().y }))
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
