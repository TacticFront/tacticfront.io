import { consolex } from "../Consolex";
import { Cell, Game, GameMap, TerrainTile, TerrainType, Tile } from "../game/Game";
import { GameUpdateViewData } from "../GameView";
import { AStar, PathFindResultType } from "../pathfinding/AStar";
import { MiniAStar } from "../pathfinding/MiniAStar";
import { GameConfig, GameID, Turn } from "../Schemas";
import { generateID } from "../Util";


export class WorkerClient {
    private worker: Worker;
    private isInitialized = false;

    constructor(private gameID: GameID, private gameConfig: GameConfig) {
        // Create a new worker using webpack worker-loader
        // The import.meta.url ensures webpack can properly bundle the worker
        this.worker = new Worker(new URL('./Worker.worker.ts', import.meta.url));
    }

    initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.worker.postMessage({
                type: 'init',
                gameID: this.gameID,
                gameConfig: this.gameConfig
            });

            const handler = (e: MessageEvent) => {
                if (e.data.type === 'initialized') {
                    this.isInitialized = true;
                    this.worker.removeEventListener('message', handler)
                    resolve();
                    return
                }
            };

            this.worker.addEventListener('message', handler);
        });
    }

    start(gameUpdate: (gu: GameUpdateViewData) => void) {
        if (!this.isInitialized) {
            throw new Error('Failed to initialize pathfinder');
        }
        const handler = (e: MessageEvent) => {
            if (e.data.type == "game_update") {
                gameUpdate(e.data.gameUpdate)
            }
        }
        this.worker.addEventListener('message', handler);
    }

    sendTurn(turn: Turn) {
        this.worker.postMessage({
            type: "turn",
            turn: turn
        })
    }

    cleanup() {
        this.worker.terminate();
    }
}

