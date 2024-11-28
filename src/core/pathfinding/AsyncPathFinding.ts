import { TerrainTile, Tile, Game, GameMap, Cell } from "../game/Game";
import { PathFindResultType } from "./PathFinding";

export class AsyncPathFinderCreator {
    private worker: Worker;
    private isInitialized = false;

    constructor(private game: Game, private gameMap: GameMap) {
        // Create a new worker using webpack worker-loader
        // The import.meta.url ensures webpack can properly bundle the worker
        this.worker = new Worker(new URL('./PathFinder.worker.ts', import.meta.url));
    }

    initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.worker.postMessage({
                type: 'init',
                gameMap: this.gameMap
            });

            const handler = (e: MessageEvent) => {
                if (e.data.type === 'initialized') {
                    this.worker.removeEventListener('message', handler);
                    this.isInitialized = true;
                    resolve();
                } else {
                    this.worker.removeEventListener('message', handler);
                    reject('Failed to initialize pathfinder');
                }
            };

            this.worker.addEventListener('message', handler);
        });
    }

    createPathFinder(src: Tile, dst: Tile, numTicks: number): AsyncPathFinder {
        if (!this.isInitialized) {
            throw new Error('PathFinder not initialized');
        }
        return new AsyncPathFinder(this.game, this.worker, src, dst, numTicks);
    }

    cleanup() {
        this.worker.terminate();
    }
}

// AsyncPathFinder.ts
export class AsyncPathFinder {
    private path: Tile[] | 'NOT_FOUND' | null = null;
    private promise: Promise<void>;

    constructor(
        private game: Game,
        private worker: Worker,
        private src: Tile,
        private dst: Tile,
        private numTicks: number
    ) { }

    findPath(): Promise<void> {
        this.promise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject("Path timeout");
            }, 100_000);

            const handler = (e: MessageEvent) => {
                clearTimeout(timeout);
                this.worker.removeEventListener('message', handler);

                if (e.data.type === 'pathFound') {
                    this.path = e.data.path.map(pos => this.game.tile(new Cell(pos.x, pos.y)));
                    resolve();
                } else {
                    reject(e.data.reason || "Path not found");
                }
            };

            this.worker.addEventListener('message', handler);
            this.worker.postMessage({
                type: 'findPath',
                requestId: crypto.randomUUID(),
                currentTick: this.game.ticks(),
                duration: this.numTicks,
                start: { x: this.src.cell().x, y: this.src.cell().y },
                end: { x: this.dst.cell().x, y: this.dst.cell().y }
            });
        });

        return this.promise;
    }

    // TODO: rename to poll?
    compute(): PathFindResultType {
        if (this.promise == null) {
            this.findPath()
        }
        this.numTicks--;
        if (this.numTicks <= 0) {
            for (let i = 0; i < 1_000_000; i++) {
                if (this.path == 'NOT_FOUND') {
                    return PathFindResultType.PathNotFound
                }
                if (this.path != null) {
                    console.log('in Asyncclient: found a path!!')
                    return PathFindResultType.Completed;
                }
            }
            throw new Error(`path not completed in time`)
        }
        return PathFindResultType.Pending;
    }

    reconstructPath(): Tile[] {
        if (this.path == "NOT_FOUND" || this.path == null) {
            throw Error(`cannot reconstruct path: ${this.path}`)
        }
        return this.path as Tile[]
    }

}